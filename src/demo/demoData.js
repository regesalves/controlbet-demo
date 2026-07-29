import { createCompleteDevDataset } from "../dev/dataGenerator";

export const DEMO_USER = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@controlbet.local",
    plan: "demo",
    user_metadata: {
        first_name: "ControlBet",
        full_name: "ControlBet Demo",
        last_name: "Portfolio Edition",
        name: "ControlBet Demo",
        plan: "demo",
        username: "controlbet.demo",
    },
};

export const DEMO_SESSION = {
    access_token: "demo-session",
    token_type: "bearer",
    user: DEMO_USER,
};

const DEMO_USER_ID = DEMO_USER.id;
const DEMO_SEED = "controlbet-demo-portfolio";

function normalizeHouse(house) {
    return {
        ...house,
        user_id: DEMO_USER_ID,
    };
}

function normalizeTicket(ticket) {
    return {
        ...ticket,
        user_id: DEMO_USER_ID,
    };
}

function normalizeMovement(movement) {
    return {
        ...movement,
        user_id: DEMO_USER_ID,
    };
}

const generated = createCompleteDevDataset({ userId: DEMO_USER_ID, seed: DEMO_SEED });

export const DEMO_BANKING_DATA = {
    houses: generated.houses.map(normalizeHouse),
    tickets: generated.tickets.map(normalizeTicket),
    movements: generated.movements.map(normalizeMovement),
};

export const DEMO_BANKING_USER_ID = DEMO_USER_ID;
