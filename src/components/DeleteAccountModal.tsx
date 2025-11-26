import { X, AlertTriangle, CreditCard, TrendingDown, Calendar } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: string;
  currentTotalAccounts: number;
  hasActiveSubscription: boolean;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  email,
  currentTotalAccounts,
  hasActiveSubscription,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  const accountsAfterDeletion = currentTotalAccounts - 1;
  const currentAdditionalAccounts = Math.max(0, currentTotalAccounts - 1);
  const newAdditionalAccounts = Math.max(0, accountsAfterDeletion - 1);

  const currentTotal = 29 + currentAdditionalAccounts * 19;
  const newTotal = accountsAfterDeletion === 0 ? 0 : 29 + newAdditionalAccounts * 19;

  const savings = currentTotal - newTotal;
  const daysLeftInMonth = 30 - new Date().getDate();
  const prorataCredit = Math.round((savings / 30) * daysLeftInMonth);

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  nextBillingDate.setDate(1);

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="relative z-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-opacity-20 rounded-lg bg-white p-3">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold">Supprimer le compte</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white transition-colors hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-opacity-90 text-white">
              Vous êtes sur le point de supprimer <span className="font-semibold">{email}</span>
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 space-y-4">
            {hasActiveSubscription && accountsAfterDeletion > 0 && (
              <>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div className="flex-1">
                      <p className="mb-2 text-sm font-medium text-blue-900">
                        Nouveau tarif mensuel
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-blue-900">{newTotal}€ HT</span>
                        <span className="text-sm text-blue-700">/mois</span>
                      </div>
                    </div>
                  </div>
                </div>

                {prorataCredit > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <div>
                        <p className="mb-1 text-sm font-medium text-green-900">Crédit prorata</p>
                        <p className="text-xs text-green-700">
                          Un crédit d'environ{' '}
                          <span className="font-semibold">{prorataCredit}€ HT</span> sera appliqué
                          sur votre prochaine facture pour les {daysLeftInMonth} jours restants de
                          ce mois.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600" />
                    <div>
                      <p className="mb-1 text-sm font-medium text-gray-900">
                        Prochaine facturation
                      </p>
                      <p className="text-xs text-gray-700">
                        À partir du{' '}
                        {nextBillingDate.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        , vous serez facturé {newTotal}€ HT/mois
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 font-medium text-white transition-all hover:shadow-lg"
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
