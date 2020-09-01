use nalgebra::Matrix4;
use awsm_web::webgl::{ResizeStrategy, PartialWebGlViewport};
use crate::renderer::Renderer;
use crate::config::{STAGE_WIDTH, STAGE_HEIGHT, STAGE_RATIO, CAMERA_DEPTH};

pub struct Camera {
    pub persp_proj_mat: Matrix4<f32>,
    pub ortho_proj_mat: Matrix4<f32>,
    pub window_width: u32,
    pub window_height: u32,
}

impl Camera {
    pub fn new(renderer: &mut Renderer, window_width: u32, window_height: u32) -> Self {
        let ortho_proj_mat = Matrix4::new_orthographic( 0.0, STAGE_WIDTH as f32, 0.0, STAGE_HEIGHT as f32, 0.01, CAMERA_DEPTH as f32);

        Self::fit_screen(renderer, window_width, window_height);

        let persp_proj_mat = Matrix4::new_perspective(
            STAGE_WIDTH as f32 / STAGE_HEIGHT as f32,
            std::f32::consts::PI / 2.0,
            1.0,
            3000.0,
        );
        
        Self { window_width, window_height, ortho_proj_mat, persp_proj_mat}
    }

    pub fn resize(&mut self, renderer: &mut Renderer, window_width: u32, window_height: u32) {
        if window_width != self.window_width || window_height != self.window_height {
            Self::fit_screen(renderer, window_width, window_height);
            self.window_width = window_width;
            self.window_height = window_height;
        }
    }

    fn fit_screen(renderer: &mut Renderer, window_width: u32, window_height: u32) {
        renderer.webgl.resize(ResizeStrategy::Canvas(window_width, window_height));
        renderer.webgl.gl.awsm_viewport(0,0, window_width, window_height); 
        renderer.setup_renderbuffer(window_width, window_height);
    }
}

/*
fn scale_to_fit(viewport_width: f64, viewport_height: f64) -> Viewport {
    let mut width = viewport_width;
    let mut height = viewport_height;

    let viewport_ratio = viewport_width / viewport_height;
    //compare viewport ratio to art resolution
    if viewport_ratio > STAGE_RATIO {
        width = height * STAGE_RATIO;
    } else {
        height = width / STAGE_RATIO;
    }

    //offset in order to center it in the area
    let x = (viewport_width - width) / 2.0;
    let y = (viewport_height - height) / 2.0;

    //how much it shrank
    let scale = width / STAGE_WIDTH;

    Viewport { x, y, width, height, scale} 
}
*/
