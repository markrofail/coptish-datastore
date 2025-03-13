import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { listAllFiles } from './utils'
import cliProgress from 'cli-progress'
import { Command } from 'commander'

const normalizeArabicText = (text: string) => {
    return text.replace(/[\u064B-\u065F\u0670]/g, '')
}

const TITLE_KEYWORDS = ['مِن مزامير', 'مِن أمثال', 'مِن إنجيل', 'مِن سفر', 'البولس', 'الكاثوليكون', 'الإبركسيس'].map(normalizeArabicText)
const isTitleLine = (line: string) => {
    const cleanedLine = normalizeArabicText(line.replaceAll('{', '').replaceAll('(', '').trim())
    return TITLE_KEYWORDS.some((keyword) => cleanedLine.startsWith(keyword))
}

// Function to split text into sections based on titles
function splitIntoSections(text: string) {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const sections = []
    let currentTitle: string | null = null
    let currentText: string[] = []

    for (const line of lines) {
        if (isTitleLine(line)) {
            // If we have a previous section, save it
            if (currentTitle !== null) {
                sections.push({
                    title: { arabic: currentTitle },
                    text: { arabic: [currentTitle, ...currentText] },
                })
            }
            // Start a new section
            currentTitle = line.trim()
            currentText = []
        } else if (currentTitle !== null) {
            // Add line to the current section's text
            currentText.push(line.trim())
        }
    }

    // Add the last section if it exists
    if (currentTitle !== null) {
        sections.push({
            title: { arabic: currentTitle },
            text: { arabic: [currentTitle, ...currentText] },
        })
    }

    return sections
}

async function convertRtfToYaml(filepath: string) {
    try {
        const text = fs.readFileSync(filepath, 'utf8')
        const sections = splitIntoSections(text)
        const yamlContent = yaml.dump(sections, { lineWidth: -1 })

        const outputPath = filepath.replace('.txt', '.yml')
        fs.writeFileSync(outputPath, yamlContent, 'utf8')
    } catch (error) {
        console.error('Error during conversion:', error)
    }
}

const program = new Command()
program //
    .argument('<input file or directory>', 'either a file or directory to process')
    .parse(process.argv)

const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

const files = listAllFiles(inputFile, { predicate: (filePath) => filePath.includes('.txt') })
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

console.log('Processing...')
const errors: { filename: string; message: string }[] = []
progressBar.start(files.length, 0) // start the progress bar with a total value of files.length and start value of 0

for (const file of files) {
    progressBar.increment()
    try {
        convertRtfToYaml(file)
    } catch (e: any) {
        errors.push({ filename: file, message: e.message })
    }
}
progressBar.stop()

if (errors.length > 0) {
    errors.map((error) => console.error(error))
    process.exit(1)
}
