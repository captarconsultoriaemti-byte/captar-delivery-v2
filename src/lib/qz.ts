// integracao com o QZ Tray (https://qz.io), programa que precisa estar instalado
// e rodando no computador da empresa pra impressao automatica em impressora
// termica funcionar. sem certificado assinado, o QZ Tray pede pra empresa
// confirmar que confia no site na primeira vez - depois disso ele lembra.
"use client";

let carregado: typeof import("qz-tray") | null = null;

async function carregarQz() {
  if (!carregado) {
    carregado = (await import("qz-tray")).default as unknown as typeof import("qz-tray");
  }
  return carregado;
}

export async function conectarQz(): Promise<{ error?: string }> {
  const qz = await carregarQz();

  if (qz.websocket.isActive()) return {};

  try {
    await qz.websocket.connect();
    return {};
  } catch {
    return {
      error:
        "Não foi possível conectar ao QZ Tray. Verifique se ele está instalado e aberto neste computador.",
    };
  }
}

export async function listarImpressoras(): Promise<{ impressoras?: string[]; error?: string }> {
  const conexao = await conectarQz();
  if (conexao.error) return { error: conexao.error };

  const qz = await carregarQz();
  try {
    const impressoras = await qz.printers.find();
    return { impressoras: Array.isArray(impressoras) ? impressoras : [impressoras] };
  } catch {
    return { error: "Não foi possível listar as impressoras." };
  }
}

export async function imprimirHtml(
  impressora: string,
  htmlContent: string,
): Promise<{ error?: string }> {
  const conexao = await conectarQz();
  if (conexao.error) return { error: conexao.error };

  const qz = await carregarQz();
  try {
    const config = qz.configs.create(impressora);
    await qz.print(config, [{ type: "pixel", format: "html", flavor: "plain", data: htmlContent }]);
    return {};
  } catch {
    return { error: "Falha ao enviar a impressão pra impressora configurada." };
  }
}
