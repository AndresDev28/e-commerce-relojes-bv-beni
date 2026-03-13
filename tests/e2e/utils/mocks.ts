
export const MOCK_PRODUCTS = [
    {
        id: 1,
        name: "Classic Chronograph",
        price: 259.99,
        slug: "classic-chronograph",
        description: "A timeless classic for any occasion.",
        stock: 10,
        images: ["/uploads/watch1.jpg"],
        image: {
            id: 101,
            url: "/uploads/watch1.jpg"
        },
        category: {
            id: 1,
            name: "Luxury",
            slug: "luxury"
        }
    },
    {
        id: 2,
        name: "Sport Digital",
        price: 129.50,
        slug: "sport-digital",
        description: "Rugged and reliable digital watch.",
        stock: 5,
        images: ["/uploads/watch2.jpg"],
        image: {
            id: 102,
            url: "/uploads/watch2.jpg"
        },
        category: {
            id: 2,
            name: "Sport",
            slug: "sport"
        }
    }
];

export const MOCK_USER = {
    id: 1,
    username: "jdoe",
    email: "jdoe@example.com",
    firstName: "John",
    lastName: "Doe",
    confirmed: true,
    blocked: false,
};

export const MOCK_AUTH_RESPONSE = {
    jwt: "mock-jwt-token",
    user: {
        id: 1,
        username: "jdoe",
        email: "jdoe@example.com"
    }
};

export const MOCK_ORDER = {
    id: 1,
    documentId: "doc-123",
    orderId: "ORD-12345",
    subtotal: 259.99,
    shipping: 0,
    total: 259.99,
    orderStatus: "paid",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    items: [
        {
            id: "1",
            name: "Classic Chronograph",
            price: 259.99,
            quantity: 1,
            images: ["/uploads/watch1.jpg"]
        }
    ],
    paymentInfo: {
        method: "card",
        last4: "4242",
        brand: "visa"
    },
    statusHistory: [
        { status: "pending", date: new Date().toISOString() },
        { status: "paid", date: new Date().toISOString() }
    ]
};

export const MOCK_SHIPPED_ORDER = {
    ...MOCK_ORDER,
    id: 2,
    orderId: "ORD-SHIPPED-678",
    orderStatus: "shipped",
    shipment: {
        tracking_number: "TRACK-999-BENI",
        carrier: "Correos",
        status: "in_transit",
        estimated_delivery_date: "2026-03-25T10:00:00Z"
    }
};

export const MOCK_ORDERS_RESPONSE = {
    data: [MOCK_SHIPPED_ORDER],
    meta: {
        pagination: {
            page: 1,
            pageSize: 10,
            pageCount: 1,
            total: 1
        }
    }
};
