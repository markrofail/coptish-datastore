// src/index.ts

import { drive_v3, google, sheets_v4 } from 'googleapis'
import * as fs from 'fs-extra'
import * as path from 'path'
import { authorize } from './google_drive_utils'
import { Prayer } from './types'
import { InfoSection, VersesSection, ReadingSection, CompoundPrayerSection } from './types'
import { SingleBar, Presets } from 'cli-progress'
import * as dotenv from 'dotenv'
dotenv.config()

const INPUT_DIRECTORY = path.join(__dirname, '../output/liturgy-st-basil')
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID as string
if (!DRIVE_FOLDER_ID) {
    throw new Error('DRIVE_FOLDER_ID environment variable is not set.')
}

async function main() {
    try {
        const auth = await authorize()
        const sheets = google.sheets({ version: 'v4', auth })
        const drive = google.drive({ version: 'v3', auth })
        const progressBar = new SingleBar({}, Presets.shades_classic)
        const folderIdCache: { [key: string]: string } = {}

        const files = await getAllJsonFiles(INPUT_DIRECTORY)
        progressBar.start(files.length, 0) // start the progress bar with a total value of files.length and start value of 0
        for (const file of files) {
            const relativeDir = path.dirname(path.relative(INPUT_DIRECTORY, file))
            const fileName = path.basename(file)

            const sheetTitle = path.basename(fileName, '.json')
            const sheet = await createSheet(sheets, sheetTitle)

            const jsonData = await fs.readJson(file)
            const dataType = getDataType(jsonData)
            if (dataType === 'prayer') {
                const data = jsonData as Prayer
                await populatePrayerSheet(sheets, sheet.spreadsheetId!, data)
                // } else if (dataType === 'reading') {
                // const data = jsonData as Reading
                // await populateReadingSheet(sheets, sheet.spreadsheetId!, data)
                // } else if (dataType === 'synaxarium') {
                // const data = jsonData as Synaxarium
                // await populateSynaxariumSheet(sheets, sheet.spreadsheetId!, data)
            } else {
                console.warn(`Unknown data type in file: ${file}`)
                continue
            }

            const driveFolderId = await getOrCreateFolderId(drive, DRIVE_FOLDER_ID, relativeDir, folderIdCache)
            await moveFileToFolder(drive, sheet.spreadsheetId!, driveFolderId)
            progressBar.increment()
        }
        progressBar.stop()
    } catch (error) {
        console.error('Error:', error)
    }
}

// Function to recursively get all JSON files
async function getAllJsonFiles(directory: string) {
    const files: string[] = []

    for (const file of await fs.readdir(directory)) {
        const fullPath = path.join(directory, file)
        const stats = await fs.stat(fullPath)

        if (stats.isDirectory()) {
            files.push(...(await getAllJsonFiles(fullPath)))
        } else if (stats.isFile() && path.extname(file) === '.json') {
            files.push(fullPath)
        }
    }

    return files
}

async function getOrCreateFolderId(
    drive: drive_v3.Drive,
    rootFolderId: string,
    relativePath: string,
    folderIdCache: { [key: string]: string },
): Promise<string> {
    if (!relativePath || relativePath === '.') return rootFolderId

    let currentFolderId = rootFolderId
    let currentPath = ''
    for (const part of relativePath.split(path.sep)) {
        currentPath = path.join(currentPath, part)

        if (folderIdCache[currentPath]) {
            currentFolderId = folderIdCache[currentPath]
        } else {
            // Check if the folder already exists in Drive
            const folderId = await createFolderIfNotExists(drive, currentFolderId, part)
            folderIdCache[currentPath] = folderId
            currentFolderId = folderId
        }
    }

    return currentFolderId
}

async function createFolderIfNotExists(drive: drive_v3.Drive, parentFolderId: string, folderName: string): Promise<string> {
    // Search for a folder with the given name in the parent folder
    const query = await drive.files.list({
        q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    })
    if (query?.data?.files?.length) return query.data.files[0].id!

    // Folder doesn't exist, create it
    const requestBody = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
    }
    const folder = await drive.files.create({ requestBody, fields: 'id' })

    return folder.data.id!
}

// Determine the type of the JSON data
function getDataType(data: any): 'prayer' | 'reading' | 'synaxarium' | null {
    if (data.sections) {
        return 'prayer'
    } else if (data.commemorations) {
        return 'synaxarium'
    } else if (data.text) {
        return 'reading'
    } else {
        return null
    }
}

// Create a new Google Sheet
async function createSheet(sheets: any, title: string): Promise<sheets_v4.Schema$Spreadsheet> {
    const resource = { properties: { title } }

    try {
        const spreadsheet = await sheets.spreadsheets.create({ resource, fields: 'spreadsheetId' })
        return spreadsheet.data
    } catch (err) {
        throw err
    }
}

// Populate the sheet for 'prayer' type
async function populatePrayerSheet(sheets: sheets_v4.Sheets, spreadsheetId: string, data: Prayer) {
    const values: string[][] = [
        ['Title', data?.title?.english || ''],
        ['Occasion', data.occasion || ''],
    ]

    // Initialize row index
    let rowIndex = values.length

    // Process sections
    data?.sections?.forEach((section, index) => {
        values.push([])
        rowIndex++
        values.push([`Section ${index + 1}`])
        rowIndex++
        values.push(['Type', section.type])
        rowIndex++

        if (section.type === 'info') {
            const infoSection = section as InfoSection
            values.push(['Text', infoSection.text.english])
            rowIndex++
        } else if (section.type === 'verses') {
            const versesSection = section as VersesSection
            // Add header row for verses
            values.push(['', 'English', 'Arabic', 'Coptic', 'Coptic English', 'Coptic Arabic'])
            rowIndex++
            versesSection.verses.forEach((verse, vIndex) => {
                values.push([
                    `${vIndex + 1}`,
                    verse.english || '',
                    verse.arabic || '',
                    verse.coptic || '',
                    verse.coptic_english || '',
                    verse.coptic_arabic || '',
                ])
                rowIndex++
            })
        } else if (section.type === 'reading') {
            const readingSection = section as ReadingSection
            values.push(['Reading Type', readingSection.readingType])
            rowIndex++
        } else if (section.type === 'compound-prayer') {
            const compoundSection = section as CompoundPrayerSection
            values.push(['Path', compoundSection.path])
            rowIndex++
        }
    })

    // Write the values to the spreadsheet
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: { values },
    })

    // Get the total number of rows and columns
    const numRows = values.length
    const numCols = Math.max(...values.map((row) => row.length))

    // Create formatting requests
    const requests: sheets_v4.Schema$Request[] = [
        // Center-align all cells
        {
            repeatCell: {
                range: {
                    sheetId: 0, // Default sheet ID is 0
                    startRowIndex: 0,
                    endRowIndex: numRows,
                    startColumnIndex: 0,
                    endColumnIndex: numCols,
                },
                cell: {
                    userEnteredFormat: {
                        verticalAlignment: 'MIDDLE',
                        horizontalAlignment: 'CENTER',
                        wrapStrategy: 'WRAP',
                    },
                },
                fields: 'userEnteredFormat(verticalAlignment,horizontalAlignment,wrapStrategy)',
            },
        },
        // Set column width for Column A to 100 pixels
        {
            updateDimensionProperties: {
                range: {
                    sheetId: 0,
                    dimension: 'COLUMNS',
                    startIndex: 0, // Column A
                    endIndex: 1,
                },
                properties: { pixelSize: 80 },
                fields: 'pixelSize',
            },
        },
        // Set column width for Columns B and beyond to 400 pixels
        {
            updateDimensionProperties: {
                range: {
                    sheetId: 0,
                    dimension: 'COLUMNS',
                    startIndex: 1, // Column B
                    endIndex: numCols,
                },
                properties: { pixelSize: 400 },
                fields: 'pixelSize',
            },
        },
    ]

    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
}

// Move the file to the specified Drive folder
async function moveFileToFolder(drive: any, fileId: string, folderId: string) {
    // Retrieve the existing parents to remove
    const file = await drive.files.get({ fileId, fields: 'parents' })

    // Move the file to the new folder
    const previousParents = file.data.parents ? file.data.parents.join(',') : ''
    await drive.files.update({ fileId, addParents: folderId, removeParents: previousParents, fields: 'id, parents' })
}

// Run the main function
main()
