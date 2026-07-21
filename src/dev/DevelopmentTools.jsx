import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  clearDevDatabase,
  generateDevHouses,
  generateDevMovements,
  generateDevTickets,
  populateCompleteDevDatabase,
  populateRandomDevDatabase,
  resetDevDatabase,
} from "./devDatabase";
import { DEFAULT_DEV_SEED, QUICK_GENERATION_COUNTS } from "./dataGenerator";
import "./development-tools.css";

const FEEDBACK_STORAGE_KEY = "controlbet_dev_tools_feedback";

function isLocalDevelopment() {
  if (typeof window === "undefined") return false;
  const localHostname = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return import.meta.env.DEV && localHostname;
}

function readStoredFeedback() {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(FEEDBACK_STORAGE_KEY);
    window.sessionStorage.removeItem(FEEDBACK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function formatOperationResult(result) {
  const parts = [];
  if (result?.houses) parts.push(`${result.houses} casas`);
  if (result?.tickets) parts.push(`${result.tickets} bilhetes`);
  if (result?.movements) parts.push(`${result.movements} movimentações`);
  return parts.length > 0 ? parts.join(", ") : "dados de teste removidos";
}

function QuickGenerationCard({ disabled, label, onChoose, type }) {
  return (
    <button
      className="dev-tools-secondary-action"
      data-testid={`dev-generate-${type}`}
      disabled={disabled}
      onClick={() => onChoose(type)}
      type="button"
    >
      {label}
    </button>
  );
}

export default function DevelopmentTools() {
  const { user } = useAuth();
  const reloadTimerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [activeOperation, setActiveOperation] = useState("");
  const [quantityTarget, setQuantityTarget] = useState(null);
  const [confirmationTarget, setConfirmationTarget] = useState(null);
  const [feedback, setFeedback] = useState(readStoredFeedback);

  useEffect(() => () => {
    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current);
    }
  }, []);

  if (!isLocalDevelopment()) return null;

  const userId = user?.id;
  const actionsDisabled = isBusy || !userId;

  function scheduleApplicationRefresh(message) {
    window.sessionStorage.setItem(
      FEEDBACK_STORAGE_KEY,
      JSON.stringify({ type: "success", message: `${message} A aplicação foi atualizada.` })
    );
    reloadTimerRef.current = window.setTimeout(() => window.location.reload(), 700);
  }

  async function runOperation(label, operation) {
    if (isBusy) return;

    setIsBusy(true);
    setActiveOperation(label);
    setFeedback({ type: "info", message: `${label} em andamento...` });
    setQuantityTarget(null);
    setConfirmationTarget(null);

    try {
      const result = await operation();
      const message = `${label} concluído: ${formatOperationResult(result)}.`;
      setFeedback({ type: "success", message });
      scheduleApplicationRefresh(message);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Não foi possível concluir a operação.",
      });
    } finally {
      setIsBusy(false);
      setActiveOperation("");
    }
  }

  function runQuickGeneration(count) {
    const operations = {
      houses: {
        label: "Geração de casas",
        run: () => generateDevHouses(userId, count),
      },
      tickets: {
        label: "Geração de bilhetes",
        run: () => generateDevTickets(userId, count),
      },
      movements: {
        label: "Geração de movimentações",
        run: () => generateDevMovements(userId, count),
      },
    };
    const selectedOperation = operations[quantityTarget];
    if (!selectedOperation) return;
    runOperation(selectedOperation.label, selectedOperation.run);
  }

  function confirmDestructiveOperation() {
    if (confirmationTarget === "clear") {
      runOperation("Limpeza do banco", () => clearDevDatabase(userId));
      return;
    }

    if (confirmationTarget === "reset") {
      runOperation("Reset do ambiente", () => resetDevDatabase(userId));
    }
  }

  return (
    <div className="dev-tools-root" data-testid="dev-tools-root">
      <button
        aria-expanded={isOpen}
        className="dev-tools-trigger"
        data-testid="dev-tools-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">🛠</span> Dev Tools
      </button>

      {isOpen ? (
        <div className="dev-tools-backdrop" onMouseDown={() => !isBusy && setIsOpen(false)}>
          <section
            aria-label="Ferramentas de desenvolvimento"
            aria-modal="true"
            className="dev-tools-panel"
            data-testid="dev-tools-panel"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="dev-tools-header">
              <div>
                <span>Ambiente local</span>
                <h2>🛠 Development Tools</h2>
                <p>Gere dados realistas para testar o ControlBet.</p>
              </div>
              <button aria-label="Fechar Dev Tools" disabled={isBusy} onClick={() => setIsOpen(false)} type="button">×</button>
            </header>

            {!userId ? (
              <div className="dev-tools-auth-warning" role="alert">
                <strong>Conta necessária</strong>
                <span>Faça login em uma conta local do Supabase para popular o banco com segurança.</span>
              </div>
            ) : (
              <div className="dev-tools-session-status">
                <span aria-hidden="true" />
                Sessão ativa: <strong>{user.email || user.id}</strong>
              </div>
            )}

            {feedback ? (
              <div className={`dev-tools-feedback ${feedback.type}`} aria-live="polite">
                {isBusy ? <span className="dev-tools-spinner" aria-hidden="true" /> : null}
                <span>{feedback.message}</span>
              </div>
            ) : null}

            <div className="dev-tools-content">
              <section className="dev-tools-section">
                <div className="dev-tools-section-title">
                  <span>Banco de testes</span>
                  <small>7 casas • 200 bilhetes • 42 movimentações</small>
                </div>
                <button
                  className="dev-tools-primary-action"
                  data-testid="dev-populate-complete"
                  disabled={actionsDisabled}
                  onClick={() => runOperation("Banco completo", () => populateCompleteDevDatabase(userId))}
                  type="button"
                >
                  {activeOperation === "Banco completo" ? "Populando..." : "Popular banco completo"}
                </button>
                <button
                  className="dev-tools-random-action"
                  data-testid="dev-populate-random"
                  disabled={actionsDisabled}
                  onClick={() => runOperation("Cenário aleatório", () => populateRandomDevDatabase(userId))}
                  type="button"
                >
                  {activeOperation === "Cenário aleatório" ? "Gerando cenário..." : "Gerar cenário aleatório"}
                </button>
                <p className="dev-tools-help-text">
                  O banco completo usa a seed fixa <code>{DEFAULT_DEV_SEED}</code>. O cenário aleatório cria uma base diferente.
                </p>
              </section>

              <section className="dev-tools-section">
                <div className="dev-tools-section-title">
                  <span>Geração rápida</span>
                  <small>Adicione registros sem limpar os dados atuais</small>
                </div>
                <div className="dev-tools-quick-grid">
                  <QuickGenerationCard disabled={actionsDisabled} label="Gerar Casas" onChoose={setQuantityTarget} type="houses" />
                  <QuickGenerationCard disabled={actionsDisabled} label="Gerar Bilhetes" onChoose={setQuantityTarget} type="tickets" />
                  <QuickGenerationCard disabled={actionsDisabled} label="Gerar Movimentações" onChoose={setQuantityTarget} type="movements" />
                </div>

                {quantityTarget ? (
                  <div className="dev-tools-quantity-picker" data-testid="dev-quantity-picker">
                    <strong>Quantos registros deseja gerar?</strong>
                    <div>
                      {QUICK_GENERATION_COUNTS.map((count) => (
                        <button disabled={isBusy} key={count} onClick={() => runQuickGeneration(count)} type="button">
                          {count}
                        </button>
                      ))}
                    </div>
                    <button className="dev-tools-inline-cancel" onClick={() => setQuantityTarget(null)} type="button">Cancelar</button>
                  </div>
                ) : null}
              </section>

              <section className="dev-tools-section dev-tools-danger-section">
                <div className="dev-tools-section-title">
                  <span>Limpeza e reset</span>
                  <small>Somente registros criados pelo Dev Tools são removidos</small>
                </div>
                <div className="dev-tools-danger-grid">
                  <button disabled={actionsDisabled} onClick={() => setConfirmationTarget("clear")} type="button">Limpar banco</button>
                  <button disabled={actionsDisabled} onClick={() => setConfirmationTarget("reset")} type="button">Resetar ambiente</button>
                </div>

                {confirmationTarget ? (
                  <div className="dev-tools-confirmation" role="alertdialog">
                    <strong>{confirmationTarget === "clear" ? "Limpar todos os dados de teste?" : "Resetar o ambiente de testes?"}</strong>
                    <p>
                      {confirmationTarget === "clear"
                        ? "Casas, bilhetes e movimentações gerados pelo Dev Tools serão removidos."
                        : `Os dados atuais serão removidos e a base fixa ${DEFAULT_DEV_SEED} será recriada.`}
                    </p>
                    <div>
                      <button className="danger" onClick={confirmDestructiveOperation} type="button">Confirmar</button>
                      <button onClick={() => setConfirmationTarget(null)} type="button">Cancelar</button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <footer className="dev-tools-footer">
              <span>Faixa isolada de IDs • usuário autenticado preservado</span>
              <strong>DEV ONLY</strong>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
