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
import customTemplates from '@manuscripts/data/dist/shared/custom-templates.json'
import templates from '@manuscripts/data/dist/shared/templates-v2.json'
import { Model } from '@manuscripts/manuscripts-json-schema'

// TODO: fetch dynamic template data from Couchbase?

export const buildTemplatesData = () => {
  const map = new Map<string, Model>()

  for (const template of templates as Model[]) {
    map.set(template._id, template)
  }

  for (const template of customTemplates as Model[]) {
    map.set(template._id, template)
  }

  return map
}

export const templatesMap = buildTemplatesData()
