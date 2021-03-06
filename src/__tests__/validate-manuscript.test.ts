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

import { ContainedModel } from '@manuscripts/manuscript-transform'
import fs from 'fs'

import { validationOptions } from '../types/input'
import { createTemplateValidator } from '../validate-manuscript'
import { data } from './__fixtures__/manuscript-data.json'

describe('validate manuscript', () => {
  test('validate manuscript', async () => {
    const manuscriptsData = (data as unknown) as Array<ContainedModel>
    const results = await validate(manuscriptsData)
    results.forEach((result) => {
      // @ts-ignore
      expect(result).toMatchSnapshot(
        {
          _id: expect.any(String),
        },
        'validate-manuscript'
      )
    })
  })

  test('validate manuscript with ignored results', async () => {
    const manuscriptsData = (data as unknown) as Array<ContainedModel>
    const results = await validate(manuscriptsData)
    manuscriptsData.push(
      // @ts-ignore
      ...results.map((result) => ({ ...result, ignored: true }))
    )
    const newResult = await validate(manuscriptsData)

    expect(newResult.length).toEqual(0)
  })

  test('validate manuscript with options', async () => {
    const manuscriptsData = (data as unknown) as Array<ContainedModel>
    const results = await validate(manuscriptsData, {
      validateImageFiles: false,
    })
    const figureTypes = [
      'figure-minimum-width-resolution',
      'figure-minimum-height-resolution',
      'figure-maximum-width-resolution',
      'figure-maximum-height-resolution',
      'figure-contains-image',
      'figure-format-validation',
    ]
    results.forEach((result) => {
      // @ts-ignore
      expect(figureTypes.toString()).toEqual(
        expect.not.stringContaining(result.type as string)
      )
    })
  })
})

const validate = async (
  data: Array<ContainedModel>,
  options?: validationOptions
) => {
  const validateManuscript = createTemplateValidator(
    'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
  )

  const getData = async (id: string): Promise<Buffer | undefined> => {
    const path = `${__dirname}/__fixtures__/data/${id}`
    if (fs.existsSync(path)) {
      return fs.readFileSync(path)
    }
    return undefined
  }
  return await validateManuscript(
    data,
    'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232',
    getData,
    options
  )
}
