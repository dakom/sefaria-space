#version 300 es
precision mediump float;

/*
    Each draw call will run this vertex shader 4 times
    e.g. once per each vertex of the unit quad

    In order to draw the appropriate cell
    The uv coords of _that_ quad (in the bitmap)
    Need to be passed in as well
*/

in vec3 a_vertex;
in vec3 a_normal;
in vec2 a_uv;

out vec2 v_uv;
out vec3 v_normal;

uniform vec3 u_cube_scaler;
uniform mat4 u_model;
uniform mat4 u_camera;

void main() {

    mat4 mvp = u_camera * u_model; 

    //mat4 quad_scaler = mat4(mat2(u_quad_scaler[0],0,0,u_quad_scaler[1]));
    mat4 cube_scaler = mat4(1.0);
    cube_scaler[0][0] = u_cube_scaler[0];
    cube_scaler[1][1] = u_cube_scaler[1];
    cube_scaler[2][2] = u_cube_scaler[2];

    gl_Position = mvp * (cube_scaler * vec4(a_vertex,1));

    v_uv = a_uv;
    v_normal = a_normal;

}
