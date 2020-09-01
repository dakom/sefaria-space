#version 300 es
precision mediump float;

/*
    Each draw call will run this vertex shader 4 times
    e.g. once per each vertex of the unit quad

    In order to draw the appropriate cell
    The uv coords of _that_ quad (in the bitmap)
    Need to be passed in as well
*/

in vec2 a_vertex;
in vec2 a_uv;

out vec2 v_uv;

uniform vec2 u_quad_scaler;
uniform mat4 u_model;
uniform mat4 u_camera;

void main() {

    mat4 mvp = u_camera * u_model; 

    //mat4 quad_scaler = mat4(mat2(u_quad_scaler[0],0,0,u_quad_scaler[1]));
    mat4 quad_scaler = mat4(1.0);
    quad_scaler[0][0] = u_quad_scaler[0];
    quad_scaler[1][1] = u_quad_scaler[1];

    gl_Position = mvp * (quad_scaler * vec4(a_vertex,1, 1));
    v_uv = a_uv;

}
