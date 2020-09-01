#version 300 es

precision mediump float;

uniform sampler2D u_sampler;
in vec2 v_uv;

out vec4 color;

void main() {
    vec4 texel = texture(u_sampler, v_uv);
    color = texel;
}
