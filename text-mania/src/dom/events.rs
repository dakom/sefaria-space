use web_sys::{window, Event, MouseEvent};
use awsm_web::window::get_window_size;
use std::rc::Rc;
use shipyard::*;
use gloo_events::EventListener;
use wasm_bindgen::JsCast;
use wasm_bindgen::UnwrapThrowExt;
use lazy_static::lazy_static;
use std::collections::HashMap;
use crate::{
    renderer::camera::Camera,
    controller::{ControllerEvent, ControllerAction},
    world::RendererViewMut
};

lazy_static! {
    static ref KEYBOARD_MAP: HashMap<&'static str, ControllerAction> = {
        let mut lookup:HashMap<&'static str, ControllerAction> = HashMap::new();
        lookup.insert("ArrowUp", ControllerAction::Jump);
        lookup.insert("ArrowDown", ControllerAction::Down);
        lookup.insert("ArrowLeft", ControllerAction::Left);
        lookup.insert("ArrowRight", ControllerAction::Right);
        lookup.insert("KeyW", ControllerAction::Jump);
        lookup.insert("KeyA", ControllerAction::Left);
        lookup.insert("KeyD", ControllerAction::Right);
        lookup.insert("KeyS", ControllerAction::Down);
        lookup.insert("Space", ControllerAction::Fire);
        lookup.insert("ControlLeft", ControllerAction::Fire);
        lookup.insert("ControlRight", ControllerAction::Fire);
        lookup.insert("ControlEnter", ControllerAction::Fire);

        lookup
    };
}


pub fn start_dom_handlers(world:Rc<World>) {
    {
        let window = window().unwrap_throw();

        let on_resize = {
            let window = window.clone();
            let world = Rc::clone(&world);
            move |_: &web_sys::Event| {
                let (width, height) = get_window_size(&window).unwrap_throw();
                
                let mut renderer = world.borrow::<RendererViewMut>();
                
                world.borrow::<UniqueViewMut<Camera>>()
                    .resize(&mut renderer, width, height);
            }
        };

        on_resize(&web_sys::Event::new("").unwrap_throw());

        EventListener::new(&window, "resize", on_resize).forget();
    }

    {
        let renderer = world.borrow::<RendererViewMut>();

        let canvas = renderer.canvas.clone();
        EventListener::new(&canvas, "pointerdown", {
            let world = Rc::clone(&world);
            move |event:&Event| {
                let camera = world.borrow::<UniqueViewMut<Camera>>();
                let event = event.dyn_ref::<web_sys::MouseEvent>().unwrap_throw();
                let (touch_x, touch_y) = get_point(&camera, &event);
                log::info!("pointerdown at {},{}", touch_x, touch_y);
            }
        }).forget();

        EventListener::new(&canvas, "pointerup", {
            let world = Rc::clone(&world);
            move |event:&Event| {
                let camera = world.borrow::<UniqueViewMut<Camera>>();
                let event = event.dyn_ref::<web_sys::MouseEvent>().unwrap_throw();
                let (touch_x, touch_y) = get_point(&camera, &event);
                log::info!("pointerup at {},{}", touch_x, touch_y);
            }
        }).forget();
    }

    {
        let window = window().unwrap_throw();

        //None of the actual logic for controllers is handled here (that's in systems)
        //Here we're just mapping keyboard events to controller events
        EventListener::new(&window, "keydown", {
            let world = Rc::clone(&world);
            move |event:&Event| {
                let event = event.dyn_ref::<web_sys::KeyboardEvent>().unwrap_throw();
                let code = event.code();
                let mut controller_events = world.borrow::<UniqueViewMut<ControllerEvent>>();

                if let Some(action) = KEYBOARD_MAP.get(&code.as_ref()) {
                    controller_events.down.insert(*action);
                }
            }
        }).forget();

        EventListener::new(&window, "keyup", {
            let world = Rc::clone(&world);
            move |event:&Event| {
                let event = event.dyn_ref::<web_sys::KeyboardEvent>().unwrap_throw();
                let code = event.code();
                let mut controller_events = world.borrow::<UniqueViewMut<ControllerEvent>>();

                if let Some(action) = KEYBOARD_MAP.get(&code.as_ref()) {
                    controller_events.up.insert(*action);
                }
            }
        }).forget();
    }
}

fn get_point(camera:&Camera, event:&MouseEvent) -> (f64, f64) {

    let (client_x, client_y) = (event.client_x() as f64, event.client_y() as f64);
   
    let (canvas_x, canvas_y) = (client_x, ((camera.window_height as f64) - client_y));


    (canvas_x, canvas_y)
}
