#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_posicaoMundo;
in vec2 v_texcoord;

uniform vec3 u_direcaoParaLuz;
uniform vec3 u_corLuz;
uniform vec3 u_luzAmbiente;
uniform vec3 u_posicaoCamera;
uniform bool u_luzLigada;

uniform vec3 u_ambiente;
uniform vec3 u_difusa;
uniform vec3 u_especular;
uniform float u_brilho;
uniform sampler2D u_textura;
uniform vec2 u_repeticao;

uniform bool u_neblinaLigada;
uniform vec3 u_corNeblina;
uniform float u_densidadeNeblina;

out vec4 corFinal;

void main() {
  vec3 texel = texture(u_textura, v_texcoord * u_repeticao).rgb;
  vec3 cor;

  if (u_luzLigada) {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_direcaoParaLuz);
    vec3 V = normalize(u_posicaoCamera - v_posicaoMundo);
    vec3 R = reflect(-L, N);

    float difusa = max(dot(N, L), 0.0);
    float especular = 0.0;
    if (difusa > 0.0) {
      especular = pow(max(dot(R, V), 0.0), u_brilho);
    }

    cor = u_ambiente * texel * u_luzAmbiente
        + u_difusa * texel * u_corLuz * difusa
        + u_especular * u_corLuz * especular;
  } else {
    cor = u_difusa * texel;
  }

  if (u_neblinaLigada) {
    float d = length(u_posicaoCamera - v_posicaoMundo) * u_densidadeNeblina;
    float fator = clamp(1.0 - exp(-d * d), 0.0, 1.0);
    cor = mix(cor, u_corNeblina, fator);
  }

  corFinal = vec4(cor, 1.0);
}