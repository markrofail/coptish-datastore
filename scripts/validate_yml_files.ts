import { Ajv } from 'ajv'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { Command } from 'commander'
import schema from '../schemas/raw_schema.json'

// Create an Ajv instance

// Validate the YAML data against the schema

const program = new Command()
program
    .version('1.0.0')
    .description('A CLI to merge multilingual prayer files')
    .argument('<input file or directory>', 'either a file or directory to merge')
    .parse(process.argv)

const [inputFile] = program.args
if (!fs.existsSync(inputFile)) {
    program.error(`input file does not exist "${inputFile}"`)
}

const ajv = new Ajv()
const validate = ajv.compile(schema)

const yamlData = yaml.load(fs.readFileSync(inputFile, 'utf8'))
if (!validate(yamlData)) {
    console.error(validate.errors)
}
