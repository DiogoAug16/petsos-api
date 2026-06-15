export const COMPLAINT_STATUS = {
  OPEN: "aberto",
  IN_PROGRESS: "em_andamento",
  AWAITING_VALIDATION: "aguardando_validacao",
  RESOLVED: "resolvido",
  CLOSED: "fechado",
};

export const VALID_COMPLAINT_STATUS = Object.values(COMPLAINT_STATUS);
