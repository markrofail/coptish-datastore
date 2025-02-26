import * as TJS from 'typescript-json-schema'
import * as fs from 'fs'
import * as path from 'path'

const typesToJsonSchema = ({ inputPath, outputPath, rootType }: { inputPath: string; outputPath: string; rootType: string }) => {
    const absoluteInputPath = path.resolve(__dirname, inputPath)
    const program = TJS.getProgramFromFiles([absoluteInputPath])
    const schema = TJS.generateSchema(program, rootType, { required: true, noExtraProps: true })

    const stringifiedSchema = JSON.stringify(schema, null, 2).replaceAll('anyOf', 'oneOf')
    const absoluteOutputPath = path.resolve(__dirname, outputPath)
    fs.writeFileSync(absoluteOutputPath, stringifiedSchema)
}

typesToJsonSchema({ rootType: 'Root', inputPath: '../schemas/types.ts', outputPath: '../schemas/schema.json' })
