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

    vec3 n = v_normal;
    vec3 l_dir = vec3(.5, .5, .5);

    // https://www.lighthouse3d.com/tutorials/glsl-tutorial/directional-lights-per-pixel/
    float intensity = max(dot(n,l_dir), 0.0);

    vec3 diffuse = texel.rgb;
    color = vec4(intensity * diffuse, 1.0);
    //vec4 ambient = vec4(0.0, 0.0, 0.0, 1.0);

    //color = max(intensity *  diffuse, ambient);
   // color = texel;
}
