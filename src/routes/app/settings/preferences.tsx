import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/app/settings/preferences')({ component: PreferencesPage })
function PreferencesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Preferences</h1>
      <form className="max-w-md space-y-4 bg-white p-6 rounded shadow" onSubmit={e => e.preventDefault()}>
        <fieldset className="space-y-2">
          <legend className="font-medium">Theme</legend>
          <select className="px-4 py-2 border rounded"><option>System</option><option>Light</option><option>Dark</option></select>
        </fieldset>
        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Save</button>
      </form>
    </div>
  )
}
