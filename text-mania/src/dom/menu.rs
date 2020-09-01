use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use awsm_web::dom::*;
use shipyard::*;
use gloo_events::EventListener;
use web_sys::{HtmlElement, HtmlInputElement, Document};
use std::rc::Rc;
use crate::gamemanager;

struct MenuElements {
    help_btn: HtmlElement,
    help_close_btn: HtmlElement,
    help_overlay: HtmlElement,
    start_btn: HtmlElement,
    ref_input: HtmlInputElement,
    stop_btn: HtmlElement,
}

impl MenuElements {
    pub fn new(document:&Document) -> Self {
        let help_btn:HtmlElement = document.get_element_by_id("help-btn").unwrap_throw().unchecked_into();
        let help_overlay:HtmlElement = document.get_element_by_id("help-overlay").unwrap_throw().unchecked_into();
        let help_close_btn:HtmlElement = document.get_element_by_id("help-close-btn").unwrap_throw().unchecked_into();
        let start_btn:HtmlElement = document.get_element_by_id("start-btn").unwrap_throw().unchecked_into();
        let stop_btn:HtmlElement = document.get_element_by_id("stop-btn").unwrap_throw().unchecked_into();
        let ref_input:HtmlInputElement = document.get_element_by_id("ref-input").unwrap_throw().unchecked_into();
        Self {
            help_btn,
            help_close_btn,
            help_overlay,
            start_btn,
            stop_btn,
            ref_input
        }
    }
}

pub fn init(world:Rc<World>) {
    let document = web_sys::window().unwrap_throw().document().unwrap_throw();

    let elements = Rc::new(MenuElements::new(&document));
    

    let listeners:Vec<EventListener> = vec![
        EventListener::new(&elements.help_btn, "click", {
            let elements = elements.clone();
            move |_| {
                elements.help_overlay.set_style("display", "block");
            }
        }),
        EventListener::new(&elements.help_close_btn, "click", {
            let elements = elements.clone();
            move |_| {
                elements.help_overlay.set_style("display", "none");
            }
        }),
        EventListener::new(&elements.start_btn, "click", {
            let elements = elements.clone();
            let world = world.clone();
            move |_| {
                let value = elements.ref_input.value();
                //elements.start_btn.set_style("display", "none");
                //elements.stop_btn.set_style("display", "block");
                gamemanager::start(world.clone(), value);
            }
        }),
        EventListener::new(&elements.stop_btn, "click", {
            let elements = elements.clone();
            let world = world.clone();
            move |_| {
                //elements.start_btn.set_style("display", "block");
                //elements.stop_btn.set_style("display", "none");
                gamemanager::stop(world.clone());
            }
        })
    ];

    std::mem::forget(Box::new(listeners));

}
