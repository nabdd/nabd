import { useLocation } from 'react-router-dom'
import { Card, EmptyState, LinkButton } from '@/components/ui'
import { PageHeader } from './AppLayout'

const names: Record<string, string> = {
  drives: 'Blood drives',
  templates: 'Message templates',
  reports: 'Reports',
  settings: 'Settings',
}

export default function ComingSoon() {
  const slug = useLocation().pathname.split('/').pop() ?? ''
  const title = names[slug] ?? 'Page not found'
  return (
    <>
      <PageHeader title={title} />
      <div className="p-4 sm:p-9">
        <Card>
          <EmptyState
            title={names[slug] ? `${title} is not built yet` : 'We could not find that page'}
            body={names[slug] ? 'This screen is outside the first release. Requests and the donor directory are fully working.' : 'Check the address or go back to your requests.'}
            action={<LinkButton to="/app" variant="light" size="sm">Back to requests</LinkButton>}
          />
        </Card>
      </div>
    </>
  )
}
