import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as http from 'http'
import * as url from 'url'
import * as open from 'open'

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json')
const TOKEN_PATH = path.join(__dirname, 'token.json')

const SCOPES = [
    'https://www.googleapis.com/auth/drive', //
    'https://www.googleapis.com/auth/spreadsheets',
]

export async function authorize(): Promise<OAuth2Client> {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
    const { client_id, client_secret, redirect_uris } = credentials.installed

    // Use the redirect URI that starts with 'http://localhost'
    const redirectUri = redirect_uris.find((uri: string) => uri.startsWith('http://localhost'))
    if (!redirectUri) {
        throw new Error('Redirect URI must be set to http://localhost')
    }

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri)

    // Check if we have previously stored a token.
    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
        oAuth2Client.setCredentials(token)
        return oAuth2Client
    } else {
        // Generate a new token.
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES })
        console.log('Authorize this app by visiting this url:', authUrl)

        // Set up a local server to receive the auth code
        return new Promise<OAuth2Client>((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                if (req.url && req.url.startsWith('/?')) {
                    const query = url.parse(req.url, true).query
                    const code = query.code as string

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/plain' })
                        res.end('Authentication successful! You can close this tab.')
                        server.close()

                        try {
                            // Exchange code for tokens
                            const tokenResponse = await oAuth2Client.getToken(code)
                            oAuth2Client.setCredentials(tokenResponse.tokens)

                            // Store the token to disk for later program executions
                            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenResponse.tokens))
                            console.log('Token stored to', TOKEN_PATH)

                            // Resolve the promise to continue execution
                            resolve(oAuth2Client)
                        } catch (error) {
                            reject(error)
                        }
                    } else {
                        res.writeHead(400, { 'Content-Type': 'text/plain' })
                        res.end('Error: No code found in the query parameters.')
                        server.close()
                        reject(new Error('No code found in the query parameters.'))
                    }
                }
            })

            // Start the server and open the authorization URL
            server.listen(3000, () => {
                // Open the URL in the default browser
                open.default(authUrl).catch((err) => {
                    console.error('Failed to open browser:', err)
                    console.log('Please open the following URL manually:', authUrl)
                })
            })
        })
    }
}
