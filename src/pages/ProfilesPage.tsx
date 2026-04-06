import { useState } from 'react'
import { Plus, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileCard } from '@/components/profiles/ProfileCard'
import { AddProfileModal } from '@/components/profiles/AddProfileModal'
import { useProfiles } from '@/hooks/useProfiles'

export default function ProfilesPage() {
  const { profiles, loading, refetch } = useProfiles()
  const [modalOpen, setModalOpen] = useState(false)

  const ownProfiles = profiles.filter((p) => p.profile_type === 'own')
  const referenceProfiles = profiles.filter(
    (p) => p.profile_type === 'reference'
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Perfis</h1>
          <p className="text-sm text-muted-foreground">
            {profiles.length}{' '}
            {profiles.length === 1 ? 'perfil adicionado' : 'perfis adicionados'}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          Adicionar Perfil
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-16">
          <Globe className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Adicione perfis do Instagram para começar a análise
          </p>
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Adicionar Perfil
          </Button>
        </div>
      )}

      {/* Own profiles */}
      {!loading && ownProfiles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Meus Perfis
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ownProfiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </section>
      )}

      {/* Reference profiles */}
      {!loading && referenceProfiles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Perfis de Referência
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {referenceProfiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </section>
      )}

      {/* Modal */}
      <AddProfileModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={refetch}
      />
    </div>
  )
}
