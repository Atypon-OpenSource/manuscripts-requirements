/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import sectionCategories from '@manuscripts/data/dist/shared/section-categories.json'
import { Decoder } from '@manuscripts/manuscript-transform'
import { Model, SectionCategory } from '@manuscripts/manuscripts-json-schema'
import chalk from 'chalk'
import decompress from 'decompress'
import fs from 'fs-extra'
import tempy from 'tempy'
import yargs from 'yargs'

import { version } from '../package.json'
import { validateManuscript } from './manuscript-validator'
import { buildModelMap } from './models'
import { ValidationResult } from './requirements'

yargs
  .scriptName('manuscript-validator')
  .version(version)
  .usage('$0 <command> filename --template [template]')
  .command<{
    filename: string
    template: string
  }>(
    'validate [filename]',
    'Validate a manuscript against a template',
    (yargs) => {
      yargs.positional('filename', {
        type: 'string',
        describe: 'the .manuproj file to validate',
      })

      // TODO: use eISSN  etc in templates?
      yargs.option('template', {
        type: 'string',
        default:
          'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article',
        describe: 'the template to validate against',
      })
    },
    async ({ filename, template }) => {
      const buffer = await fs.readFile(filename)

      const tempDir = tempy.directory()
      await decompress(buffer, tempDir)

      const { data } = await fs.readJSON(tempDir + '/index.manuscript-json')
      const modelMap = buildModelMap(data as Model[])
      const article = new Decoder(modelMap).createArticleNode()

      const results = await validateManuscript(article, template)

      for (const result of results) {
        const { type, passed, severity, data } = result

        const message = buildMessage(result)

        console.log(passed ? chalk.red(message) : chalk.green(message))
      }
    }
  )
  .demandCommand()
  .help().argv

export type ValidationType =
  | 'required-section'
  | 'manuscript-maximum-characters'
  | 'manuscript-minimum-characters'
  | 'manuscript-maximum-words'
  | 'manuscript-minimum-words'
  | 'section-maximum-characters'
  | 'section-minimum-characters'
  | 'section-maximum-words'
  | 'section-minimum-words'

const sectionCategoriesMap = buildModelMap<SectionCategory>(
  sectionCategories as SectionCategory[]
)

const buildMessage = (result: ValidationResult) => {
  const { type, passed, severity, data } = result

  switch (type) {
    case 'required-section': {
      const category = sectionCategoriesMap.get(
        data.category
      ) as SectionCategory

      return `There must be a ${category.name} section`
    }

    case 'manuscript-maximum-characters':
      return `The manuscript must have less than ${data.value} characters`

    case 'manuscript-minimum-characters':
      return `The manuscript must have more than ${data.value} characters`

    case 'manuscript-maximum-words':
      return `The manuscript must have less than ${data.value} words`

    case 'manuscript-minimum-words':
      return `The manuscript must have more than ${data.value} words`

    case 'section-maximum-characters':
      return `The section must have less than ${data.value} characters`

    case 'section-minimum-characters':
      return `The section must have more than ${data.value} characters`

    case 'section-maximum-words':
      return `The section must have less than ${data.value} words`

    case 'section-minimum-words':
      return `The section must have more than ${data.value} words`
  }
}
