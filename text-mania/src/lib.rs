mod renderer;
mod textures;
mod tick;
mod controller;
mod dom;
mod world;
mod config;
mod gameobjects;
mod motion;
mod gamemanager;
mod sefaria;
mod blaster;
mod collision;
mod audio;

use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;
use std::rc::Rc;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen(start)]
pub async fn run() -> Result<(), JsValue> {
    init_logger();

    dom::fonts::init().await;

    let renderer = renderer::Renderer::new().await?;

    let world = Rc::new(world::init_world(renderer));

    textures::load_all(Rc::clone(&world)).await?;

    gameobjects::bg::create(&world);

    blaster::create(&world);
    dom::events::start_dom_handlers(Rc::clone(&world));

    tick::start(Rc::clone(&world));

    dom::menu::init(Rc::clone(&world));

    gamemanager::start(Rc::clone(&world), "Genesis 1".to_string());

    Ok(())
}


// enable logging and panic hook only during debug builds
cfg_if! {
    if #[cfg(all(feature = "wasm-logger", feature = "console_error_panic_hook", debug_assertions))] {
        fn init_logger() {
            wasm_logger::init(wasm_logger::Config::default());
            console_error_panic_hook::set_once();
            log::info!("rust logging enabled!!!");
        }
    } else {
        fn init_logger() {
            log::info!("rust logging disabled!"); //<-- won't be seen
        }
    }
}

