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

import { ManuscriptTemplate } from '@manuscripts/manuscripts-json-schema'

import {
  buildManuscriptCountRequirements,
  buildRequiredSections,
  buildSectionCountRequirements,
  buildTemplateRequirementIDs,
  buildTemplateRequirements,
  buildTemplateRequirementsMap,
} from '../requirements'
import { templatesMap } from '../templates'

describe('manuscript requirements', () => {
  test('builds requirements from a template', () => {
    expect(templatesMap.size).toBeGreaterThan(10000)

    const templateID =
      'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
    const template = templatesMap.get(templateID) as ManuscriptTemplate
    expect(template).toMatchSnapshot('template')

    const requirementIDs = buildTemplateRequirementIDs(template)
    expect(requirementIDs).toHaveLength(10)

    const requirementsMap = buildTemplateRequirementsMap(requirementIDs)
    expect(requirementsMap.size).toBe(10)

    const requirements = buildTemplateRequirements(requirementsMap)

    const counts: Record<string, number> = {}

    for (const [key, items] of Object.entries(requirements)) {
      if (items) {
        counts[key] = items.length
      }
    }

    expect(counts).toEqual({
      MPMaximumManuscriptWordCountRequirement: 1,
      MPMinimumManuscriptWordCountRequirement: 1,
      MPMaximumAuxiliaryObjectCountRequirement: 1,
      MPMandatorySubsectionsRequirement: 7,
    })

    expect(requirements).toMatchSnapshot('requirements')

    const requiredSections = buildRequiredSections(requirements)
    expect(requiredSections).toHaveLength(6)
    expect(requiredSections).toMatchSnapshot('required-sections')

    const manuscriptCountRequirements = buildManuscriptCountRequirements(
      requirements
    )
    expect(manuscriptCountRequirements).toMatchSnapshot(
      'manuscript-count-requirements'
    )

    const sectionCountRequirements = buildSectionCountRequirements(requirements)
    expect(sectionCountRequirements).toMatchSnapshot(
      'section-count-requirements'
    )
  })
})
