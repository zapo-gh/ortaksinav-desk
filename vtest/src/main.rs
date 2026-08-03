use ed25519_dalek::{VerifyingKey, Signature, Verifier};
fn main() {
    let pk_hex = "fc1eeeb3068450d0c29e76d7cc3dc3cabdb03aecde387a292c8add54778c76cf";
    let pk_bytes = hex::decode(pk_hex).unwrap();
    let pk = VerifyingKey::from_bytes(&pk_bytes.try_into().unwrap()).unwrap();
    
    let sig_bytes = hex::decode("FA4DCBC8C3D8141B00827FFF247296A1FE8CD375A1D6220D38817D4DA9C9E4C4523204D91C8DF27665F70D0BE78C287507C5B92A0EE89D8F131C9C7A66438A07").unwrap();
    let sig = Signature::from_bytes(&sig_bytes.try_into().unwrap());
    
    let is_valid = pk.verify("7B22".as_bytes(), &sig).is_ok();
    println!("Verified: {}", is_valid);
}
