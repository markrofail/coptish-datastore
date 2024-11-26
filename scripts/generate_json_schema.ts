import * as TJS from 'typescript-json-schema'
import * as fs from 'fs'
import * as path from 'path'

const INPUT_TYPES = path.resolve(__dirname, '../schemas/types.ts')
const OUTPUT_SCHEMA = path.resolve(__dirname, '../schemas/schema.json')

const program = TJS.getProgramFromFiles([INPUT_TYPES])
const schema = TJS.generateSchema(program, 'Root', {required: true, noExtraProps: true})

fs.writeFileSync(OUTPUT_SCHEMA, JSON.stringify(schema, null, 2))
