use awsm_web::{
    webgl::{
        Id,
        WebGl2Renderer, 
        WebGlContextOptions,
        get_webgl_context_2,
        GlToggle,
        BlendFactor,
        BufferMask,
        BeginMode,
        AttributeOptions, 
        DataType,
        BufferData,
        BufferTarget,
        BufferUsage,
        VertexArray,
        RenderBufferFormat,
        FrameBufferTarget,
        FrameBufferAttachment,
        FrameBufferTextureTarget,
        BlitFilter,
        TextureTarget,
        SimpleTextureOptions,
        WebGlTextureSource,
        PixelFormat,
        TextureWrapMode,
        TextureMinFilter,
        TextureMagFilter,
    },
    loaders::fetch::fetch_url
};

use web_sys::HtmlCanvasElement;
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use shipyard::*;
use shipyard_scenegraph::*;
use nalgebra::Matrix4;
use super::buffers::{QuadBuffers, CubeBuffers, BlitBuffers};
use super::components::*;
use crate::textures::Texture;
use super::camera::Camera;

pub struct DrawProgramData {
    pub program_id: Id,
    pub vao_id: Id,
}


impl DrawProgramData {

    pub async fn new_quad(webgl:&mut WebGl2Renderer) -> Result<Self, JsValue> {
        let vertex = fetch_url("media/shaders/quad_vertex.glsl").await?.text().await?;
        let fragment = fetch_url("media/shaders/quad_fragment.glsl").await?.text().await?;
        
        cfg_if::cfg_if! {
            if #[cfg(feature = "dev")] {
                let program_id = webgl.compile_program(&vertex, &fragment).unwrap();
            } else {
                let program_id = webgl.compile_program(&vertex, &fragment).unwrap_throw();
            }
        }


        let QuadBuffers { vao, ..} = QuadBuffers::new(webgl).await?;


        Ok(Self{
            program_id,
            vao_id: vao,
        })
    }

    pub async fn new_blit(webgl:&mut WebGl2Renderer) -> Result<Self, JsValue> {
        let vertex = fetch_url("media/shaders/blit_vertex.glsl").await?.text().await?;
        let fragment = fetch_url("media/shaders/blit_fragment.glsl").await?.text().await?;
        
        cfg_if::cfg_if! {
            if #[cfg(feature = "dev")] {
                let program_id = webgl.compile_program(&vertex, &fragment).unwrap();
            } else {
                let program_id = webgl.compile_program(&vertex, &fragment).unwrap_throw();
            }
        }


        let BlitBuffers { vao, ..} = BlitBuffers::new(webgl).await?;


        Ok(Self{
            program_id,
            vao_id: vao,
        })
    }
}

pub struct ElementsProgramData {
    pub program_id: Id,
    pub vao_id: Id,
    pub n_elements: u32
}

impl ElementsProgramData {
    pub async fn new_cube(webgl:&mut WebGl2Renderer) -> Result<Self, JsValue> {
        let vertex = fetch_url("media/shaders/cube_vertex.glsl").await?.text().await?;
        let fragment = fetch_url("media/shaders/cube_fragment.glsl").await?.text().await?;
        cfg_if::cfg_if! {
            if #[cfg(feature = "dev")] {
                let program_id = webgl.compile_program(&vertex, &fragment).unwrap();
            } else {
                let program_id = webgl.compile_program(&vertex, &fragment).unwrap_throw();
            }
        }

        let CubeBuffers { vao, n_elements, .. } = CubeBuffers::new(webgl).await?;



        Ok(Self {
            program_id,
            vao_id: vao,
            n_elements
        })
    }
}

pub struct Renderer {
    pub canvas: HtmlCanvasElement,
    pub webgl: WebGl2Renderer,
    programs: Programs,
    buffers: Buffers
}

pub struct Programs {
    pub quad:DrawProgramData,
    pub cube:ElementsProgramData,
    pub blit:DrawProgramData,
}

impl Programs {
    pub async fn new(webgl:&mut WebGl2Renderer) -> Result<Self, JsValue> {
        let quad = DrawProgramData::new_quad(webgl).await?;
        let cube = ElementsProgramData::new_cube(webgl).await?;
        let blit = DrawProgramData::new_blit(webgl).await?;

        Ok(Self {
            quad,
            cube,
            blit,
        })
    }
}

pub struct Buffers {
    pub renderbuffer_color: Id,
    pub renderbuffer_depth: Id,
    pub framebuffer_render: Id,
    pub framebuffer_color: Id,
    pub render_texture: Id,
}

impl Buffers {
    pub fn new(webgl:&mut WebGl2Renderer) -> Result<Self, JsValue> {
        let renderbuffer_color = webgl.create_renderbuffer()?;
        let renderbuffer_depth = webgl.create_renderbuffer()?;
        let framebuffer_render = webgl.create_framebuffer()?;
        let framebuffer_color= webgl.create_framebuffer()?;
        let render_texture = webgl.create_texture()?;

        Ok(Self {
            renderbuffer_color,
            renderbuffer_depth,
            framebuffer_render,
            framebuffer_color,
            render_texture
        })
    }
}

impl Renderer {
    pub async fn new() -> Result<Self, JsValue> {
        let canvas:HtmlCanvasElement = web_sys::window()
            .unwrap_throw()
            .document()
            .unwrap_throw()
            .get_element_by_id("canvas")
            .unwrap_throw()
            .dyn_into()
            .unwrap_throw();

         let gl = get_webgl_context_2(&canvas, Some(&WebGlContextOptions {
            alpha: false,
            antialias: true, //going to do manually as a post-process effect
            premultiplied_alpha: false,
            ..WebGlContextOptions::default()
        })).unwrap_throw();

        let mut webgl= WebGl2Renderer::new(gl).unwrap_throw();

        let programs = Programs::new(&mut webgl).await?;
        let buffers = Buffers::new(&mut webgl)?;

        webgl.gl.clear_color(0.0, 0.0, 0.0, 1.0);

        
        Ok(Self { 
            canvas, 
            webgl, 
            programs,
            buffers
        })
    }

    pub fn setup_renderbuffer(&mut self, width:u32, height: u32) {
        let webgl = &mut self.webgl;
        let Buffers { renderbuffer_color, renderbuffer_depth, framebuffer_color, framebuffer_render, render_texture } = self.buffers;

        webgl.assign_renderbuffer_storage_multisample_max(renderbuffer_depth, RenderBufferFormat::DepthComponent32f, width, height).unwrap_throw();
        webgl.assign_renderbuffer_storage_multisample_max(renderbuffer_color, RenderBufferFormat::Rgba8, width, height).unwrap_throw();
        webgl.assign_framebuffer_renderbuffer(framebuffer_render, renderbuffer_color, FrameBufferTarget::FrameBuffer, FrameBufferAttachment::Color0).unwrap();
        webgl.assign_framebuffer_renderbuffer(framebuffer_render, renderbuffer_depth, FrameBufferTarget::FrameBuffer, FrameBufferAttachment::Depth).unwrap();
        webgl.check_framebuffer_status(FrameBufferTarget::FrameBuffer).unwrap();
        webgl.release_framebuffer(FrameBufferTarget::FrameBuffer);

        webgl.assign_simple_texture(
            render_texture,
            TextureTarget::Texture2d,
            &SimpleTextureOptions {
                flip_y: Some(false),
                filter_min: Some(TextureMinFilter::Nearest),
                filter_mag: Some(TextureMagFilter::Nearest),
                pixel_format: PixelFormat::Rgba,
                ..SimpleTextureOptions::default()
            },
            &WebGlTextureSource::EmptyBufferView(width, height, 0),
        ).unwrap_throw();

        webgl.assign_framebuffer_texture_2d(framebuffer_color, render_texture, FrameBufferTarget::FrameBuffer, FrameBufferAttachment::Color0, FrameBufferTextureTarget::Texture2d).unwrap_throw();

        webgl.release_renderbuffer();
        webgl.release_framebuffer(FrameBufferTarget::FrameBuffer);
        /*
         * use awsm_web::webgl::PartialWebGlQueries;
            let max_samples: usize = webgl.gl.awsm_get_parameter_usize(awsm_web::webgl::GlQuery::MaxSamples).unwrap_throw();
            log::info!("max samples: {}", max_samples);
        */

        //webgl.assign_renderbuffer_storage(renderbuffer, RenderBufferFormat::Rgba8, width, height).unwrap_throw();

        //webgl.assign_framebuffer_texture_2d(draw_framebuffer, post_texture, FrameBufferTarget::FrameBuffer, FrameBufferAttachment::Color0, FrameBufferTextureTarget::Texture2d).unwrap_throw();
        //webgl.assign_framebuffer_texture_2d(post_framebuffer, post_texture, FrameBufferTarget::FrameBuffer, FrameBufferAttachment::Color0, FrameBufferTextureTarget::Texture2d).unwrap_throw();
        //webgl.release_framebuffer(FrameBufferTarget::FrameBuffer);
    }

    pub fn pre_render(&mut self) {
        let webgl = &mut self.webgl;
        webgl.bind_framebuffer(self.buffers.framebuffer_render, FrameBufferTarget::FrameBuffer).unwrap_throw();
        webgl.set_depth_mask(true);
        webgl.toggle(GlToggle::Blend, true);
        webgl.set_blend_func(BlendFactor::SrcAlpha, BlendFactor::OneMinusSrcAlpha);
        webgl.toggle(GlToggle::DepthTest, true);
        webgl.clear(&[ BufferMask::ColorBufferBit, BufferMask::DepthBufferBit, ]);
    }

    pub fn post_render(&mut self, camera:&Camera) {
        let webgl = &mut self.webgl;
        let Buffers { renderbuffer_color, renderbuffer_depth, framebuffer_color, framebuffer_render, render_texture } = self.buffers;

        let width = camera.window_width;
        let height = camera.window_height;

        // PASS 1
        webgl.bind_framebuffer(framebuffer_render, FrameBufferTarget::ReadFrameBuffer).unwrap_throw();
        webgl.bind_framebuffer(framebuffer_color, FrameBufferTarget::DrawFrameBuffer).unwrap_throw();
        webgl.blit_framebuffer(
            0,0, width, height,
            0,0, width, height,
            BufferMask::ColorBufferBit, 
            BlitFilter::Linear
        );

        // PASS 2
        let DrawProgramData {program_id, vao_id } = &self.programs.blit;
        let webgl = &mut self.webgl;

        webgl.release_framebuffer(FrameBufferTarget::FrameBuffer);

        webgl.activate_program(*program_id).unwrap_throw(); 

        webgl.activate_texture_for_sampler(render_texture, "u_sampler").unwrap_throw();
        webgl.activate_vertex_array(*vao_id).unwrap_throw();
        webgl.draw_arrays(BeginMode::TriangleStrip, 0, 4);
    }

    pub fn clear_depth(&mut self) {
        self.webgl.clear(&[ BufferMask::DepthBufferBit, ]);
    }

    pub fn render_cubes<'a> (&mut self, renderables: impl Shiperator<Item = (&'a RenderableCube, &'a WorldTransform)>, camera_mat:&Matrix4<f32>) {
        let ElementsProgramData {program_id, vao_id, n_elements} = &self.programs.cube;
        let webgl = &mut self.webgl;

        webgl.activate_program(*program_id).unwrap_throw(); 

        webgl.upload_uniform_mat_4("u_camera", &camera_mat.as_slice()).unwrap_throw();

        let mut model_mat:[f32;16] = [0.0;16];


        renderables.for_each(|(renderable, world_transform)| {
            let RenderableCube { width, height, depth, ..} = renderable;
            let texture_id = renderable.texture.id;
            webgl.activate_texture_for_sampler(texture_id, "u_sampler").unwrap_throw();
            
            //cube scaler
            webgl.upload_uniform_fvals_3("u_cube_scaler", (*width, *height, *depth)).unwrap_throw();

            //model matrix
            world_transform.0.write_to_vf32(&mut model_mat);
            
            webgl.upload_uniform_mat_4("u_model", &model_mat).unwrap_throw();
            webgl.activate_vertex_array(*vao_id).unwrap_throw();
            webgl.draw_elements(BeginMode::Triangles, *n_elements, DataType::UnsignedByte, 0);
        });
    }

    pub fn render_ortho_quads<'a> (&mut self, renderables: impl Shiperator<Item = (&'a RenderableQuad, &'a WorldTransform, &'a OrthoQuad)>, camera_mat:&Matrix4<f32>) {
       
        let DrawProgramData {program_id, vao_id } = &self.programs.quad;
        let webgl = &mut self.webgl;

        webgl.activate_program(*program_id).unwrap_throw(); 
        webgl.upload_uniform_mat_4("u_camera", &camera_mat.as_slice()).unwrap_throw();

        let mut model_mat:[f32;16] = [0.0;16];


        renderables.for_each(|(renderable, world_transform, _)| {
            let texture_id = renderable.texture.id;
            let tex_width = renderable.texture.width;
            let tex_height = renderable.texture.height;
            
            //quad scaler
            webgl.upload_uniform_fvals_2("u_quad_scaler", (tex_width as f32, tex_height as f32)).unwrap_throw();

            //model matrix
            world_transform.0.write_to_vf32(&mut model_mat);

            webgl.upload_uniform_mat_4("u_model", &model_mat).unwrap_throw();
            webgl.activate_texture_for_sampler(texture_id, "u_sampler").unwrap_throw();
            webgl.activate_vertex_array(*vao_id).unwrap_throw();
            webgl.draw_arrays(BeginMode::TriangleStrip, 0, 4);
        });

    }
    pub fn render_persp_quads<'a> (&mut self, renderables: impl Shiperator<Item = (&'a RenderableQuad, &'a WorldTransform, &'a PerspQuad)>, camera_mat:&Matrix4<f32>) {
       
        let DrawProgramData {program_id, vao_id } = &self.programs.quad;
        let webgl = &mut self.webgl;

        webgl.activate_program(*program_id).unwrap_throw(); 
        webgl.upload_uniform_mat_4("u_camera", &camera_mat.as_slice()).unwrap_throw();

        let mut model_mat:[f32;16] = [0.0;16];


        renderables.for_each(|(renderable, world_transform, _)| {
            let texture_id = renderable.texture.id;
            let tex_width = renderable.texture.width;
            let tex_height = renderable.texture.height;
            
            //quad scaler
            webgl.upload_uniform_fvals_2("u_quad_scaler", (tex_width as f32, tex_height as f32)).unwrap_throw();

            //model matrix
            world_transform.0.write_to_vf32(&mut model_mat);

            webgl.upload_uniform_mat_4("u_model", &model_mat).unwrap_throw();
            webgl.activate_texture_for_sampler(texture_id, "u_sampler").unwrap_throw();
            webgl.activate_vertex_array(*vao_id).unwrap_throw();
            webgl.draw_arrays(BeginMode::TriangleStrip, 0, 4);
        });

    }


}
