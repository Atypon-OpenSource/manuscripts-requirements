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

import { ManuscriptTemplate, SectionCategory } from '@manuscripts/json-schema'

import { InputError } from './errors'
import { createRequirementsValidator } from './validate'

const buildSectionCategoriesMap = (
  sectionCategory: SectionCategory[],
  map: Map<string, SectionCategory>
) => {
  for (const category of sectionCategory) {
    map.set(category._id, category)
  }
}

export const sectionCategoriesMap = new Map<string, SectionCategory>()
export let template: ManuscriptTemplate

export const createTemplateValidator = (
  manuscriptTemplate: ManuscriptTemplate | null,
  sectionCategories: SectionCategory[]
) => {
  if (!manuscriptTemplate) {
    throw new InputError('Could not find template')
  }

  buildSectionCategoriesMap(sectionCategories, sectionCategoriesMap)

  template = manuscriptTemplate
  return createRequirementsValidator(manuscriptTemplate as ManuscriptTemplate)
}
