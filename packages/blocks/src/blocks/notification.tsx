import { z } from "zod";
import type { ComponentType } from "react";
import type { BlockDefinition, BlockRenderProps } from "../types.js";

/**
 * Bloc `notification` — affiche un message statique (différent des notifications
 * dynamiques produites par les actions `notifyError`/`notifyWarning` du moteur).
 *
 * Utilisé pour des messages d'info contextuels dans le parcours.
 */
export const NotificationConfig = z.object({
  level: z.enum(["info", "success", "warning", "error"]).default("info"),
  title: z.string().optional(),
  message: z.string().min(1),
});
export type NotificationConfig = z.infer<typeof NotificationConfig>;

const NotificationRender: ComponentType<BlockRenderProps<NotificationConfig>> = ({ config }) => {
  const className = {
    info: "fr-alert fr-alert--info",
    success: "fr-alert fr-alert--success",
    warning: "fr-alert fr-alert--warning",
    error: "fr-alert fr-alert--error",
  }[config.level];
  return (
    <div className={`${className} fr-mt-2w`}>
      {config.title ? <h3 className="fr-alert__title">{config.title}</h3> : null}
      <p>{config.message}</p>
    </div>
  );
};

export const notificationBlock: BlockDefinition<NotificationConfig> = {
  type: "notification",
  configSchema: NotificationConfig,
  editorMeta: {
    label: "Notification",
    icon: "fr-icon-alert-line",
    group: "Information",
    description: "Message informatif (info/success/warning/error) DSFR.",
  },
  readsDataIds: () => [],
  writesDataIds: () => [],
  render: NotificationRender,
};
