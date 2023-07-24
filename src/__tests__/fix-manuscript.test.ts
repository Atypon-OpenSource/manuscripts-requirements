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

import 'regenerator-runtime/runtime'

import {
  ObjectTypes,
  RequiredSectionValidationResult,
  Section,
  SectionOrderValidationResult,
  SectionTitleValidationResult,
} from '@manuscripts/json-schema'
import { Build, ContainedModel } from '@manuscripts/transform'
import fs from 'fs'

import { runManuscriptFixes } from '../fix-manuscript'
import { isSection } from '../utils'
import { createTemplateValidator } from '../validate-manuscript'
import { data } from './__fixtures__/manuscript-data.json'

test('Add and reorder sections', async () => {
  const data: Array<ContainedModel> = [
    {
      containerID: 'MPProject:1',
      createdAt: 0,
      updatedAt: 0,
      objectType: ObjectTypes.Manuscript,
      _id: 'test',
    },
  ]
  const orderedSections = [
    'MPSectionCategory:introduction',
    'MPSectionCategory:materials-method',
    'MPSectionCategory:abstract',
    'MPSectionCategory:results',
  ]

  const shuffledSections = orderedSections
    .map((el) => ({ sort: Math.random(), value: el }))
    .sort((a, b) => a.sort - b.sort)
    .map((el) => el.value)

  const requiredSectionValidationResults: Array<RequiredSectionValidationResult> =
    shuffledSections.map(
      (sectionCategory) =>
        Object.assign(
          {
            passed: false,
            severity: 0,
            type: 'required-section',
          },
          {
            data: {
              sectionDescription: {
                sectionCategory,
              },
            },
          }
        ) as RequiredSectionValidationResult
    )
  const requiredSectionsFix = runManuscriptFixes(
    data,
    'test',
    requiredSectionValidationResults
  )
    .filter((model) => isSection(model))
    .map((model) => (model as Section).category)

  expect(requiredSectionsFix).toEqual(shuffledSections)

  const sectionOrderValidationResult: Array<
    Build<SectionOrderValidationResult>
  > = [
    {
      ignored: false,
      passed: false,
      severity: 0,
      type: 'section-order',
      data: {
        order: orderedSections,
      },
      _id: '',
      objectType: 'MPSectionOrderValidationResult',
    },
  ]
  const sectionsOrderFix = runManuscriptFixes(
    data,
    'test',
    sectionOrderValidationResult
  )
    .filter((model) => isSection(model))
    .map((model) => model as Section)
    .filter((section) => {
      if (section.category) {
        return orderedSections.includes(section.category)
      }
      return false
    })
    .sort((a, b) => a.priority - b.priority)
    .map((section) => section.category)

  expect(sectionsOrderFix).toStrictEqual(orderedSections)
})

test('Retitle sections', async () => {
  const sectionID = 'MPSection:TEST'
  const requiredTitle = 'Methods'
  const manuscriptData = [
    {
      containerID: 'MPProject:1',
      manuscriptID: 'MPManuscript:1',
      createdAt: 0,
      updatedAt: 0,
      objectType: ObjectTypes.Manuscript,
      _id: 'test',
    },
    {
      containerID: 'MPProject:1',
      createdAt: 1601237242,
      updatedAt: 1601237242,
      _id: sectionID,
      objectType: ObjectTypes.Section,
      priority: 1,
      path: ['MPSection:B8FE1A66-6588-4065-BD2E-F6176CFD9CD4'],
      title: 'foo',
      category: 'MPSectionCategory:materials-method',
    },
  ]

  const validationResults: Build<SectionTitleValidationResult> = {
    ignored: false,
    _id: '',
    objectType: 'MPSectionTitleValidationResult',
    passed: false,
    severity: 0,
    type: 'section-title-match',
    data: {
      title: requiredTitle,
    },
    affectedElementId: sectionID,
  }

  const results = runManuscriptFixes(manuscriptData, 'test', [
    validationResults,
  ])
  const testSection = results.find(
    (model) => model._id === 'MPSection:TEST'
  ) as Section
  expect(testSection.title).toMatch(requiredTitle)
})

test('Validate autofix', async () => {
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
  const manuscriptID = 'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
  //@ts-ignore
  const manuscriptModels = data as Array<ContainedModel>
  const validationResults = await validateManuscript(
    manuscriptModels,
    manuscriptID,
    getData
  )
  const fixedModels = runManuscriptFixes(
    manuscriptModels,
    manuscriptID,
    validationResults
  )
  const results = await validateManuscript(fixedModels, manuscriptID, getData)
  results.forEach((result) => {
    // make sure all the fixable objects are passed now
    const value = !result.passed && result.fixable
    // TODO: section-order requires two fix passes if there is a missing sections can this be done in one pass?
    if (
      (value && result.type === 'section-order') ||
      (value && result.type === 'keywords-order')
    ) {
      return
    }
    expect(value).toBeFalsy()
  })
})
