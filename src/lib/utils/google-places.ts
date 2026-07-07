// Autocomplete de bairro via Google Places API (New). Usado tanto pra cadastro
// de bairros de entrega da empresa quanto (futuramente) pra outros campos de
// endereco - centraliza aqui pra nao duplicar a chamada em cada tela.

export interface SugestaoBairro {
  placeId: string;
  descricao: string;
}

export interface DetalhesBairro {
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

function apiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
}

// concatena cidade/estado no texto de busca pra o Google priorizar resultados
// da regiao certa (a API nova nao aceita vies por texto, so por lat/lng, e nao
// vale a pena geocodificar so pra isso)
export async function buscarSugestoesBairro(
  texto: string,
  cidade: string,
  estado: string,
): Promise<SugestaoBairro[]> {
  if (!texto.trim() || !apiKey()) return [];

  const input = cidade && estado ? `${texto}, ${cidade} - ${estado}` : texto;

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["br"],
      includedPrimaryTypes: ["sublocality", "neighborhood", "locality"],
      languageCode: "pt-BR",
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const sugestoes = (data.suggestions ?? []) as {
    placePrediction?: { placeId: string; text: { text: string } };
  }[];

  return sugestoes
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      descricao: s.placePrediction!.text.text,
    }));
}

export async function buscarDetalhesBairro(placeId: string): Promise<DetalhesBairro> {
  if (!apiKey()) return { bairro: null, cidade: null, estado: null };

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=addressComponents`,
    { headers: { "X-Goog-Api-Key": apiKey() } },
  );

  if (!response.ok) return { bairro: null, cidade: null, estado: null };

  const data = await response.json();
  const componentes = (data.addressComponents ?? []) as {
    longText: string;
    types: string[];
  }[];

  function porTipo(tipo: string) {
    return componentes.find((c) => c.types.includes(tipo))?.longText ?? null;
  }

  return {
    bairro: porTipo("sublocality") ?? porTipo("neighborhood"),
    cidade: porTipo("administrative_area_level_2") ?? porTipo("locality"),
    estado: porTipo("administrative_area_level_1"),
  };
}
