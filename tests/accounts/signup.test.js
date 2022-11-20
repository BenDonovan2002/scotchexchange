const signup = require("../../dist/accounts/signup");

test( "Testing Sign Up Username Input Validation", () => {
    expect( signup.SignUpUser(
        "", "Ben", "Donovan", "bendonovan2019@icloud.com", "toor") ).toBe(
            false
        );
} );

test( "Testing Sign Up First Name Input Validation", () => {
    expect( signup.SignUpUser(
        "r_patches", "", "Donovan", "bendonovan2019@icloud.com", "toor") ).toBe(
            false
        );
} );

test( "Testing Sign Up Last Name Input Validation", () => {
    expect( signup.SignUpUser(
        "r_patches", "Ben", "", "bendonovan2019@icloud.com", "toor") ).toBe(
            false
        );
} );

test( "Testing Sign Up Email Input Validation", () => {
    expect( signup.SignUpUser(
        "r_patches", "Ben", "Donovan", "", "toor") ).toBe(
            false
        );
} );

test( "Testing Sign Up Password Validation", () => {
    expect( signup.SignUpUser(
        "r_patches", "Ben", "Donovan", "bendonovan2019@icloud.com", "") ).toBe(
            false
        );
} );

test( "Testing Correct Values", () => {
    expect( signup.SignUpUser(
        "r_patches", "Ben", "Donovan", "bendonovan2019@icloud.com", "toor") ).toBe(
            true
        );
} );