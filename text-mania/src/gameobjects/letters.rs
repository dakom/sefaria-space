use wasm_bindgen::prelude::*;
use shipyard_scenegraph as sg;
use nalgebra::Vector3;
use derive_deref::{Deref, DerefMut};
use shipyard::*;
use crate::{
    world::RendererViewMut,
    renderer::components::RenderableQuad,
    textures::GameTextures,
    config::CAMERA_DEPTH,
};
use std::rc::Rc;
use awsm_web::loaders::image;
use awsm_web::webgl::{WebGl2Renderer, Id, TextureTarget, SimpleTextureOptions, PixelFormat, WebGlTextureSource};

//TODO - create letter game object!
pub fn create(world:&World) {
}
