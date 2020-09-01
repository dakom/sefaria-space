use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use shipyard::*;
use crate::world::RendererViewMut;
use crate::config::LETTERS;
use std::rc::Rc;
use web_sys::{HtmlCanvasElement, CanvasRenderingContext2d};
use awsm_web::loaders::image;
use awsm_web::webgl::{WebGl2Renderer, Id, TextureTarget, SimpleTextureOptions, PixelFormat, WebGlTextureSource};
//use crate::geometry::bounds::{Bounds, BoundsExt};


#[derive(Clone)]
pub struct Texture {
    pub id: Id,
    pub width: usize,
    pub height: usize,
}

impl Texture {
    pub async fn load(webgl:&mut WebGl2Renderer, src:&str) -> Result<Self, JsValue> {
        let img = image::load(format!("media/images/{}", src)).await?;
        let id = webgl.create_texture()?;
        webgl.assign_simple_texture(
            id,
            TextureTarget::Texture2d,
            &SimpleTextureOptions {
                pixel_format: PixelFormat::Rgba,
                ..SimpleTextureOptions::default()
            },
            &WebGlTextureSource::ImageElement(&img),
        )?;

        Ok(Self {
            id,
            width: img.width() as usize, 
            height:img.height() as usize,
        })
        
    }

    pub async fn letter_atlas(webgl:&mut WebGl2Renderer) -> Vec<Self> {
        LETTERS
            .iter()
            .map(|c| {
                let canvas = make_canvas_text(128, 128, &format!("{}", c));

                let id = webgl.create_texture().unwrap_throw();

                webgl.assign_simple_texture(
                    id,
                    TextureTarget::Texture2d,
                    &SimpleTextureOptions {
                        pixel_format: PixelFormat::Rgba,
                        ..SimpleTextureOptions::default()
                    },
                    &WebGlTextureSource::CanvasElement(&canvas),
                ).unwrap_throw();

                Self {
                    id,
                    width: canvas.width() as usize,
                    height: canvas.height() as usize,
                }
            }).collect()
    }
    pub async fn blaster(webgl:&mut WebGl2Renderer) -> Self {
        let canvas = make_canvas_color(128, 128, "brown");

        let id = webgl.create_texture().unwrap_throw();

        webgl.assign_simple_texture(
            id,
            TextureTarget::Texture2d,
            &SimpleTextureOptions {
                pixel_format: PixelFormat::Rgba,
                ..SimpleTextureOptions::default()
            },
            &WebGlTextureSource::CanvasElement(&canvas),
        ).unwrap_throw();

        Self {
            id,
            width: canvas.width() as usize,
            height: canvas.height() as usize,
        }
    }
    pub async fn laser(webgl:&mut WebGl2Renderer) -> Self {
        let canvas = make_canvas_laser();

        let id = webgl.create_texture().unwrap_throw();

        webgl.assign_simple_texture(
            id,
            TextureTarget::Texture2d,
            &SimpleTextureOptions {
                pixel_format: PixelFormat::Rgba,
                ..SimpleTextureOptions::default()
            },
            &WebGlTextureSource::CanvasElement(&canvas),
        ).unwrap_throw();

        Self {
            id,
            width: canvas.width() as usize,
            height: canvas.height() as usize,
        }
    }
}

fn make_canvas_text(width: u32, height: u32, text:&str) -> HtmlCanvasElement {
    let canvas:HtmlCanvasElement = 
        web_sys::window()
            .unwrap_throw()
            .document()
            .unwrap_throw()
            .create_element("canvas")
            .unwrap_throw()
            .unchecked_into();

    canvas.set_width(width);
    canvas.set_height(height);

    let ctx:CanvasRenderingContext2d = canvas.get_context("2d")
        .unwrap_throw()
        .unwrap_throw()
        .unchecked_into();

    ctx.set_fill_style(&JsValue::from_str("white"));
    ctx.fill_rect(0.0,0.0,width as f64, height as f64);

    ctx.set_text_align("center");
    ctx.set_text_baseline("middle");
    ctx.set_fill_style(&JsValue::from("black"));
    ctx.set_font("128px TaameyFrankCLM");
    ctx.fill_text(text, (width as f64)/2.0,(height as f64)/2.0).unwrap_throw();

    /*
        web_sys::window()
            .unwrap_throw()
            .document()
            .unwrap_throw()
            .body()
            .unwrap_throw()
            .append_child(&canvas);
            */
    canvas

}
fn make_canvas_color(width: u32, height: u32, color:&str) -> HtmlCanvasElement {
    let canvas:HtmlCanvasElement = 
        web_sys::window()
            .unwrap_throw()
            .document()
            .unwrap_throw()
            .create_element("canvas")
            .unwrap_throw()
            .unchecked_into();

    canvas.set_width(width);
    canvas.set_height(height);

    let ctx:CanvasRenderingContext2d = canvas.get_context("2d")
        .unwrap_throw()
        .unwrap_throw()
        .unchecked_into();

    ctx.set_fill_style(&JsValue::from_str(color));
    ctx.fill_rect(0.0,0.0,width as f64, height as f64);

    canvas

}

fn make_canvas_laser() -> HtmlCanvasElement {

    let width:f64 = 8.0;
    let height:f64 = 32.0;

    let canvas:HtmlCanvasElement = 
        web_sys::window()
            .unwrap_throw()
            .document()
            .unwrap_throw()
            .create_element("canvas")
            .unwrap_throw()
            .unchecked_into();

    canvas.set_width(width as u32);
    canvas.set_height(height as u32);

    let ctx:CanvasRenderingContext2d = canvas.get_context("2d")
        .unwrap_throw()
        .unwrap_throw()
        .unchecked_into();

    let grd = ctx.create_linear_gradient(0.0, 0.0, width, 0.0);
    grd.add_color_stop(0.0, "rgba(0.0,0.0,255.0,0.0)").unwrap(); 
    grd.add_color_stop(0.3, "rgba(0.0,0.0,255.0,0.0)").unwrap(); 
    grd.add_color_stop(0.4, "rgba(0.0,0.0,255.0,1.0)").unwrap(); 
    grd.add_color_stop(0.6, "rgba(0.0,0.0,255.0,1.0)").unwrap(); 
    grd.add_color_stop(0.7, "rgba(0.0,0.0,255.0,0.0)").unwrap(); 
    grd.add_color_stop(1.0, "rgba(0.0,0.0,255.0,0.0)").unwrap(); 
    ctx.set_fill_style(&grd);
    ctx.fill_rect(0.0,0.0,width, height);

    canvas

}


pub struct GameTextures {
    pub bg: Texture,
    pub blaster: Texture,
    pub laser: Texture,
    //TODO - should be texture atlas 
    pub letters: Vec<Texture>,
}

pub async fn load_all(world:Rc<World>) -> Result<(), JsValue> {

    let game_textures = {
        let mut renderer = world.borrow::<RendererViewMut>();
        let bg = Texture::load(&mut renderer.webgl, "bg.jpg").await?;
        let letters = Texture::letter_atlas(&mut renderer.webgl).await;
        let blaster = Texture::blaster(&mut renderer.webgl).await;
        let laser = Texture::laser(&mut renderer.webgl).await;
        GameTextures {
            bg,
            letters,
            blaster,
            laser
        }
    };

    world.add_unique(game_textures);
    
    Ok(())
}
