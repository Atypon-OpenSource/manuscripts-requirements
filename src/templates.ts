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
import { Model } from '@manuscripts/json-schema'

import testTemplates from './__tests__/__fixtures__/templates.json'

// TODO: fetch dynamic template data from Couchbase?

const buildTemplateModelMap = (): Map<string, Model> => {
  const map = new Map<string, Model>()
  /** templateModels we get from @manuscripts/data removed,
   *  this part of the code is kept as a reference in case
   *  we need to use the manuscripts requirement validation  */
  for (const model of [] as Model[]) {
    map.set(model._id, model)
  }

  if (process.env.NODE_ENV !== 'production') {
    //For Debugging
    for (const model of testTemplates as Model[]) {
      map.set(model._id, model)
    }
  }

  return map
}

export const templateModelMap = buildTemplateModelMap()
