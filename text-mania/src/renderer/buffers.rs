use awsm_web::webgl::{
    WebGl2Renderer, 
    BufferData, 
    BufferTarget, 
    BufferUsage, 
    Id,
    AttributeOptions,
    VertexArray,
    DataType
};
use wasm_bindgen::prelude::*;


pub struct QuadBuffers {
    pub vao: Id,
    pub vertices: Id,
    pub uvs: Id,
}

impl QuadBuffers {

    pub async fn new (webgl:&mut WebGl2Renderer) -> Result<QuadBuffers, JsValue> {

        let vertices= webgl.create_buffer()?;
        webgl.upload_buffer(
            vertices,
            BufferData::new(
                &QUAD_GEOM_UNIT,
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let uvs = webgl.create_buffer()?;
        webgl.upload_buffer(
            uvs,
            BufferData::new(
                &QUAD_UVS[..],
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let vao = webgl.create_vertex_array()?;

        webgl.assign_vertex_array(
            vao,
            None,
            &[
                VertexArray {
                    attribute_name: "a_vertex",
                    buffer_id: vertices,
                    opts: AttributeOptions::new(2, DataType::Float),
                },
                VertexArray {
                    attribute_name: "a_uv",
                    buffer_id: uvs,
                    opts: AttributeOptions::new(2, DataType::Float),
                },
            ],
        )?;
        Ok(QuadBuffers { vao, vertices, uvs } )
    }
}
pub struct BlitBuffers {
    pub vao: Id,
    pub vertices: Id,
    pub uvs: Id,
}

impl BlitBuffers {

    pub async fn new (webgl:&mut WebGl2Renderer) -> Result<Self, JsValue> {

        let vertices= webgl.create_buffer()?;
        webgl.upload_buffer(
            vertices,
            BufferData::new(
                &BLIT_GEOM_UNIT,
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let uvs = webgl.create_buffer()?;
        webgl.upload_buffer(
            uvs,
            BufferData::new(
                &BLIT_UVS[..],
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let vao = webgl.create_vertex_array()?;

        webgl.assign_vertex_array(
            vao,
            None,
            &[
                VertexArray {
                    attribute_name: "a_vertex",
                    buffer_id: vertices,
                    opts: AttributeOptions::new(2, DataType::Float),
                },
                VertexArray {
                    attribute_name: "a_uv",
                    buffer_id: uvs,
                    opts: AttributeOptions::new(2, DataType::Float),
                },
            ],
        )?;
        Ok(Self { vao, vertices, uvs } )
    }
}

pub struct CubeBuffers {
    pub vao: Id,
    pub vertices: Id,
    pub normals: Id,
    pub uvs: Id,
    pub elements: Id,
    pub n_elements: u32
}

impl CubeBuffers {
    pub async fn new(webgl:&mut WebGl2Renderer) -> Result<CubeBuffers, JsValue> {
        let vertices = webgl.create_buffer()?;

        webgl.upload_buffer(
            vertices,
            BufferData::new(
                &CUBE_GEOM_UNIT[..],
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let normals = webgl.create_buffer()?;
        webgl.upload_buffer(
            normals,
            BufferData::new(
                &CUBE_GEOM_NORMALS[..],
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let uvs = webgl.create_buffer()?;
        webgl.upload_buffer(
            uvs,
            BufferData::new(
                &CUBE_UVS[..],
                BufferTarget::ArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;

        let elements = webgl.create_buffer()?;

        webgl.upload_buffer(
            elements,
            BufferData::new(
                &CUBE_ELEMENTS[..],
                BufferTarget::ElementArrayBuffer,
                BufferUsage::StaticDraw,
            ),
        )?;
        
        let vao = webgl.create_vertex_array()?;
        webgl.assign_vertex_array(
            vao,
            Some(elements),
            &[
                VertexArray {
                    attribute_name: "a_vertex",
                    buffer_id: vertices,
                    opts: AttributeOptions::new(3, DataType::Float),
                },
                VertexArray {
                    attribute_name: "a_normal",
                    buffer_id: normals,
                    opts: AttributeOptions::new(3, DataType::Float),
                },
                VertexArray {
                    attribute_name: "a_uv",
                    buffer_id: uvs,
                    opts: AttributeOptions::new(2, DataType::Float),
                },
            ],
        )?;

        Ok(Self {
            vao,
            vertices,
            normals,
            uvs,
            elements,
            n_elements: CUBE_ELEMENTS.len() as u32
        })
    }
}

//QUAD
static QUAD_GEOM_UNIT: [f32; 8] = [
    0.0, 1.0, // top-left
    0.0, 0.0, //bottom-left
    1.0, 1.0, // top-right
    1.0, 0.0, // bottom-right
];

static QUAD_UVS: [f32;8] = [
    0.0, 1.0, // top-left
    0.0, 0.0, //bottom-left
    1.0, 1.0, // top-right
    1.0, 0.0, // bottom-right
];

//QUAD
static BLIT_GEOM_UNIT: [f32; 8] = [
    -1.0, 1.0, // top-left
    -1.0, -1.0, //bottom-left
    1.0, 1.0, // top-right
    1.0, -1.0, // bottom-right
];

static BLIT_UVS: [f32;8] = [
    0.0, 1.0, // top-left
    0.0, 0.0, //bottom-left
    1.0, 1.0, // top-right
    1.0, 0.0, // bottom-right
];
//CUBE 
static CUBE_GEOM_UNIT: [f32; 72] = [
    // v0-v1-v2-v3 front
    1.0, 1.0, 1.0, 
    -1.0, 1.0, 1.0, 
    -1.0, -1.0, 1.0, 
    1.0, -1.0, 1.0, 

    // v0-v3-v4-v5 right
    1.0, 1.0, 1.0, 
    1.0, -1.0, 1.0, 
    1.0, -1.0, -1.0, 
    1.0, 1.0, -1.0, 

    // v0-v5-v6-v1 up
    1.0, 1.0, 1.0, 
    1.0, 1.0, -1.0, 
    -1.0, 1.0, -1.0, 
    -1.0, 1.0, 1.0, 

    // v1-v6-v7-v2 left
    -1.0, 1.0, 1.0, 
    -1.0, 1.0, -1.0, 
    -1.0, -1.0, -1.0, 
    -1.0, -1.0, 1.0, 

    // v7-v4-v3-v2 down
    -1.0, -1.0, -1.0, 
    1.0, -1.0, -1.0, 
    1.0, -1.0, 1.0, 
    -1.0, -1.0, 1.0, 

    // v4-v7-v6-v5 back
    1.0, -1.0, -1.0, 
    -1.0, -1.0, -1.0, 
    -1.0, 1.0, -1.0, 
    1.0, 1.0, -1.0, 
];


static CUBE_ELEMENTS: [u8; 36] = [
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // right
    8, 9, 10, 8, 10, 11, // up
    12, 13, 14, 12, 14, 15, // left
    16, 17, 18, 16, 18, 19, // down
    20, 21, 22, 20, 22, 23, // back
];



static CUBE_GEOM_NORMALS: [f32; 72] = [
    // v0-v1-v2-v3 front
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,

    // v0-v3-v4-v5 right
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,

    // v0-v5-v6-v1 top
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,

    // v1-v6-v7-v2 left
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,

    // v7-v4-v3-v2 bottom
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,

    // v4-v7-v6-v5 back
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0
];

static CUBE_UVS: [f32; 48] = [
    // v0-v1-v2-v3 front
    1.0, 1.0,
    0.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    // v0-v3-v4-v5 right
    0.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,

    // v0-v5-v6-v1 top
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,
    0.0, 0.0,

    // v1-v6-v7-v2 left
    1.0, 1.0,
    0.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    // v7-v4-v3-v2 bottom
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,

    // v4-v7-v6-v5 back
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0
];
