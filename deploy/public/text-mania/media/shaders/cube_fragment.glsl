#version 300 es

precision mediump float;

uniform sampler2D u_sampler;
in vec2 v_uv;
in vec3 v_normal;

out vec4 color;

void main() {
    vec4 texel = texture(u_sampler, v_uv);
    color = vec4(v_uv, 1.0, 1.0);
    color = vec4(v_normal, 1.0);

    color = texel;
}
