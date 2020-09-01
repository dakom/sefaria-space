use shipyard::*;
use std::rc::Rc;
use crate::gameobjects;
use crate::sefaria::SefariaRef;
use crate::audio::init_context;
use wasm_bindgen::UnwrapThrowExt;
use wasm_bindgen_futures::{JsFuture, spawn_local, future_to_promise};
use web_sys::AudioContext;

pub fn start(world:Rc<World>, ref_id:String) {

    init_context(&world);
    
    spawn_local(async move {
        let sefaria_ref = SefariaRef::load(&ref_id).await;
        *world.borrow::<UniqueViewMut<SefariaRef>>() = sefaria_ref;
    });
    //gameobjects::cubes::create(&world);
}

pub fn stop(world:Rc<World>) {
}

