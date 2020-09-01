use std::collections::{HashSet, HashMap};
use derive_deref::{Deref, DerefMut};
use shipyard::*;
use shipyard_scenegraph::Translation;
use crate::tick::{TickBegin, TickUpdate};
use nalgebra::Vector3;

pub struct Motion {
    pub direction:Vector3<f64>,
    pub strength: f64
}

impl Motion {
    pub fn new(origin:Vector3<f64>, dest:Vector3<f64>, strength:f64) -> Self {
        let vector = dest - origin;

        let direction = vector.normalize();

        Self {
            direction,
            strength
        }
    }
}


pub fn motion_sys(
    _tick: UniqueView<TickUpdate>, 
    mut translations: ViewMut<Translation>,
    motions: View<Motion>,
) {
    (&motions, &mut translations)
        .iter()
        .for_each(|(motion, translation)| {
            let vel:Vector3<f64> = motion.direction * motion.strength;

            translation.0 += vel;
        });
}
