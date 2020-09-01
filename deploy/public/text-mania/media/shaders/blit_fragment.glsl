#version 300 es
precision highp float;
precision highp int;

uniform sampler2D u_sampler;

in vec2 v_uv;

out vec4 color;

void main()
{
    color = texture(u_sampler, v_uv);
}
