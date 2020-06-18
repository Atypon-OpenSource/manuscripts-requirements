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
import projectDump from '@manuscripts/examples/data/project-dump.json'
import { Decoder } from '@manuscripts/manuscript-transform'
import { Model } from '@manuscripts/manuscripts-json-schema'

import { validateManuscript } from '../manuscript-validator'
import { buildModelMap } from '../models'

const manuscriptID = 'MPManuscript:8EB79C14-9F61-483A-902F-A0B8EF5973C9'
const templateID =
  'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'

const modelMap = buildModelMap(projectDump.data as Model[])

describe('manuscript validator', () => {
  test('validates a manuscript with a template', async () => {
    const article = new Decoder(modelMap).createArticleNode(manuscriptID)

    const results = await validateManuscript(article, templateID)

    expect(results).toMatchSnapshot('validation-results')
  })
})
