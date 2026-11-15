#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

uniform mat4 u_viewProjecao;
uniform mat4 u_modelo;
uniform mat4 u_modeloInvTransp;

out vec3 v_normal;
out vec3 v_posicaoMundo;
out vec2 v_texcoord;

void main() {
  vec4 posicaoMundo = u_modelo * a_position;
  gl_Position = u_viewProjecao * posicaoMundo;

  v_posicaoMundo = posicaoMundo.xyz;
  v_normal = mat3(u_modeloInvTransp) * a_normal;
  v_texcoord = a_texcoord;
}