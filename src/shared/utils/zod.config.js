import { z } from "zod";

z.config({
  customError: (issue) => {
    const issuePath = issue.path.join(".");

    if (issue.input === undefined) {
      const string = "O campo " + issuePath + " é obrigatório.";
      return { message: string };
    }

    if (issue.code === "invalid_type") {
      const string = "O campo " + issuePath + " possui um tipo inválido.";
      return { message: string };
    }

    if (issue.code === "too_small") {
      const string = "O campo " + issuePath + " é muito pequeno.";
      return { message: string };
    }

    if (issue.code === "too_big") {
      const string = "O campo " + issuePath + " é muito grande.";
      return { message: string };
    }

    if (issue.code === "invalid_value") {
      const string = "O campo " + issuePath + " possui um valor inválido.";
      return { message: string };
    }
  },
});
