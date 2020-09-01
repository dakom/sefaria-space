use wasm_bindgen::prelude::*;
use std::collections::{HashSet, HashMap};
use derive_deref::{Deref, DerefMut};
use shipyard::*;
use crate::tick::{TickBegin, TickUpdate};
use crate::blaster::Blaster;
use crate::config::*;
use shipyard_scenegraph::Translation;
/*
    The input that happened between ticks
*/

pub struct ControllerEvent {
    pub down:HashSet<ControllerAction>,
    pub up:HashSet<ControllerAction>,
}
impl ControllerEvent {
    pub fn new() -> Self {
        Self {
            down: HashSet::new(),
            up: HashSet::new(),
        }
    }
}

#[derive(Deref, DerefMut)]
pub struct Controller(pub HashMap<ControllerAction, ControllerState>);

impl Controller {
    pub fn new() -> Self {
        Self (HashMap::new())
    }
}

#[derive(Hash, Eq, PartialEq, Clone, Copy, Debug)]
pub enum ControllerAction {
    Jump,
    Fire,
    Left,
    Right,
    Down
}

#[derive(Debug, PartialEq)]
pub enum ControllerState {
    Activated,
    Held(f64), //the amount of time its been held
    Released
}


pub fn controller_event_sys(tick: UniqueView<TickBegin>, mut controller_events:UniqueViewMut<ControllerEvent>, mut controller: UniqueViewMut<Controller>) {
    for action in controller_events.up.iter() {
        controller.insert(*action, ControllerState::Released);
    }

    for state in controller.values_mut() {
        if *state == ControllerState::Activated {
            *state = ControllerState::Held(0.0);
        } else if let ControllerState::Held(value) = *state {
            *state = ControllerState::Held(value + tick.delta);
        }
    }

    for action in controller_events.down.iter() {
        //only insert if it's not already in there
        controller
            .entry(*action)
            .or_insert(ControllerState::Activated);
    }

    controller_events.down.clear();
    controller_events.up.clear();
}

pub fn controller_clear_sys(_tick: UniqueView<TickBegin>, mut controller:UniqueViewMut<Controller>) {
    controller.retain(|_, state| {
        *state != ControllerState::Released
    });
}
