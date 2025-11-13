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

    const currentTotal = 29 + (currentAdditionalAccounts * 19);
    const newTotal = accountsAfterDeletion === 0 ? 0 : 29 + (newAdditionalAccounts * 19);

    const savings = currentTotal - newTotal;
    const daysLeftInMonth = 30 - new Date().getDate();
    const prorataCredit = Math.round((savings / 30) * daysLeftInMonth);

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    nextBillingDate.setDate(1);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold">Supprimer le compte</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-white text-opacity-90">
                            Vous êtes sur le point de supprimer <span className="font-semibold">{email}</span>
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="space-y-4 mb-6">
                        {hasActiveSubscription && accountsAfterDeletion > 0 && (
                            <>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <TrendingDown className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-blue-900 mb-2">
                                                Nouveau tarif mensuel
                                            </p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-blue-900">{newTotal}€</span>
                                                <span className="text-sm text-blue-700">/mois</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {prorataCredit > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-green-900 mb-1">
                                                    Crédit prorata
                                                </p>
                                                <p className="text-xs text-green-700">
                                                    Un crédit d'environ <span className="font-semibold">{prorataCredit}€</span> sera appliqué sur votre prochaine facture pour les {daysLeftInMonth} jours restants de ce mois.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 mb-1">
                                                Prochaine facturation
                                            </p>
                                            <p className="text-xs text-gray-700">
                                                À partir du {nextBillingDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}, vous serez facturé {newTotal}€/mois
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
                            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                        >
                            Confirmer la suppression
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
