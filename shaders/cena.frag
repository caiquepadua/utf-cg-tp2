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

out vec4 corFinal;

void main() {
  vec3 texel = texture(u_textura, v_texcoord).rgb;

  if (!u_luzLigada) {
    corFinal = vec4(u_difusa * texel, 1.0);
    return;
  }

  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_direcaoParaLuz);
  vec3 V = normalize(u_posicaoCamera - v_posicaoMundo);
  vec3 R = reflect(-L, N);

  float difusa = max(dot(N, L), 0.0);
  float especular = 0.0;
  if (difusa > 0.0) {
    especular = pow(max(dot(R, V), 0.0), u_brilho);
  }

  vec3 cor = u_ambiente * texel * u_luzAmbiente
           + u_difusa * texel * u_corLuz * difusa
           + u_especular * u_corLuz * especular;

  corFinal = vec4(cor, 1.0);
}