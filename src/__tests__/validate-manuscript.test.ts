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

import fs from 'fs'

import { createTemplateValidator } from '../validate-manuscript'
import { data } from './__fixtures__/manuscript-data.json'

test('validate manuscript', async () => {
  const validateManuscript = createTemplateValidator(
    'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
  )

  const getData = (id: string): Promise<Buffer> => {
    return fs.promises.readFile(`${__dirname}/__fixtures__/data/${id}`)
  }
  const results = await validateManuscript(
    // @ts-ignore
    data,
    'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232',
    getData
  )
  expect(results).toMatchSnapshot('validate-manuscript')
})
