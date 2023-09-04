/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams } from 'react-router-dom'
// import { headersForDocs } from '../components/dynamicTableHelpers'
// import DynamicTable from '../components/DynamicTable'
import { Doc, ChangesResponse } from '@fireproof/core'
import { fireproof, useFireproof } from 'use-fireproof'
import { CID } from 'multiformats'
import { restore, snapshot } from '../lib/db'

export function Database() {
  const { dbName } = useParams()
  const { database: dashDb, useLiveQuery } = useFireproof('_dashboard')
  // const {database, useLiveQuery : ulq} = useFireproof(dbName as string)

  const snapshots = useLiveQuery(
    (doc, map) => {
      if (doc.type === 'snapshot') {
        map(doc.name!)
      }
    },
    { key: dbName }
  )

  const importLog = useLiveQuery(
    (doc, map) => {
      if (doc.type === 'import') {
        map(doc.name)
      }
    },
    { key: dbName }
  )

  console.log({ snapshots, importLog })
  const doRestore = data => async () => {
    if (!data.snapshot) data.snapshot = data.import || {}
    const {
      snapshot: { key, car }
    }: { snapshot: { key: string; car: string } } = data
    await snapshot(dashDb, dbName!)
    await restore(dbName!, { key, car })
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl">{dbName}</h2>
      <p>This database is has additional metadata tracked by the dashboard.</p>
      <h3 className="text-xl mt-2">Snapshots</h3>
      <ul>
        {snapshots.docs.map((doc: any) => (
          <li key={doc._id}>
            <span>Snapped at: {new Date(doc.created).toLocaleString()}</span>
            <button onClick={doRestore(doc)}>Restore</button>
          </li>
        ))}
      </ul>
      <h3 className="text-xl mt-2">Imports</h3>
      <ul>
        {importLog.docs.map((doc: any) => (
          <li key={doc._id}>
            <span>Imported at: {new Date(doc.created).toLocaleString()}</span>
            <button onClick={doRestore(doc)}>Restore</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
