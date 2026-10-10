### 3.3.3 Data Dictionary

The data dictionary contains the collection and description of data in the database. It comprises the field name, field type, required, key, and domain.

#### Table 1: Users
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the user record. |
| full_name | varchar(150) | YES | | The full name of the user. |
| email | varchar(255) | YES | UK | The email address of the user. |
| password_hash | varchar(255) | YES | | The user's password (hashed). |
| role | varchar(20) | NO | | The account role ('customer', 'staff', 'admin'). |
| phone_number | varchar(30) | NO | | The contact phone number of the user. |
| address | text | NO | | The residential or delivery address of the user. |
| is_verified | boolean | NO | | The email verification status of the account. |
| verification_otp | varchar(10) | NO | | The one-time password used for verification. |
| otp_expires_at | datetime | NO | | The expiration timestamp of the OTP. |
| created_at | datetime | NO | | The date and time when the account was registered. |
| updated_at | datetime | NO | | The date and time when the account was last updated. |

<br>

#### Table 2: Categories
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the category record. |
| name | varchar(100) | YES | | The display name of the category. |
| slug | varchar(100) | YES | UK | The unique URL slug of the category. |
| description | text | NO | | The description of the product category. |
| group_name | varchar(100) | NO | | The high-level group name of the category. |
| item_count | int(11) | NO | | The cached number of products in the category. |
| created_at | datetime | NO | | The date and time when the category was created. |

<br>

#### Table 3: Products
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the product record. |
| name | varchar(255) | YES | | The name or title of the product. |
| description | text | NO | | The detailed description of the product. |
| category | varchar(100) | YES | FK | The category slug referencing the Categories table. |
| price | decimal(10,2) | YES | | The retail selling price of the product. |
| stock_quantity | int(11) | YES | | The available quantity in stock. |
| sku | varchar(100) | NO | UK | The unique Stock Keeping Unit identifier. |
| image_url | text | NO | | The image asset URL of the product. |
| is_available | boolean | NO | | The product availability flag for public listing. |
| is_featured | boolean | NO | | The flag indicating if product is featured on landing page. |
| created_at | datetime | NO | | The date and time when the product was added. |
| updated_at | datetime | NO | | The date and time when the product was last modified. |

<br>

#### Table 4: Orders
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the order record. |
| order_number | varchar(50) | YES | UK | The unique order tracking number. |
| user_id | int(11) | NO | FK | The user ID of the customer who placed the order. |
| customer_name | varchar(150) | YES | | The name of the customer at time of checkout. |
| customer_email | varchar(255) | YES | | The email address of the customer. |
| customer_phone | varchar(30) | YES | | The contact number of the customer. |
| delivery_type | varchar(50) | NO | | The delivery method ('delivery' or 'pickup'). |
| delivery_address | text | NO | | The complete shipping destination address. |
| notes | text | NO | | Optional customer delivery instructions or notes. |
| payment_method | varchar(50) | YES | | The chosen payment mode ('gcash', 'cod', 'card'). |
| subtotal | decimal(10,2) | YES | | The total cost of items before shipping fee. |
| shipping_fee | decimal(10,2) | YES | | The logistics shipping fee charged. |
| total_amount | decimal(10,2) | YES | | The final total payable amount of the order. |
| order_status | varchar(50) | NO | | The fulfillment status of the order. |
| payment_status | varchar(50) | NO | | The payment settlement status of the order. |
| decline_reason | text | NO | | The reason recorded if order was declined or cancelled. |
| created_at | datetime | NO | | The date and time when the order was placed. |
| updated_at | datetime | NO | | The date and time when the order was last updated. |

<br>

#### Table 5: Order_Items
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the order item record. |
| order_id | int(11) | YES | FK | The order ID referencing the Orders table. |
| product_id | int(11) | NO | FK | The product ID referencing the Products table. |
| product_name | varchar(255) | YES | | The snapshot name of the product at purchase. |
| quantity | int(11) | YES | | The number of units purchased. |
| unit_price | decimal(10,2) | YES | | The unit price of the product at purchase. |
| subtotal | decimal(10,2) | YES | | The total cost for this line item. |

<br>

#### Table 6: Billings
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the billing invoice. |
| order_id | int(11) | YES | FK | The order ID referencing the Orders table. |
| invoice_number | varchar(50) | YES | UK | The unique invoice receipt number. |
| customer_name | varchar(150) | YES | | The billed customer's name. |
| customer_email | varchar(255) | YES | | The billed customer's email address. |
| customer_phone | varchar(30) | NO | | The billed customer's phone number. |
| subtotal | decimal(10,2) | YES | | The pre-shipping billed subtotal. |
| shipping_fee | decimal(10,2) | YES | | The billed shipping fee. |
| total_amount | decimal(10,2) | YES | | The final gross billed amount. |
| payment_method | varchar(50) | YES | | The payment method used ('gcash', 'cod', 'card'). |
| payment_status | varchar(50) | NO | | The invoice payment settlement status. |
| payment_date | datetime | NO | | The date and time when the payment was confirmed. |
| created_at | datetime | NO | | The date and time when the invoice was generated. |

<br>

#### Table 7: Repairs
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | int(11) | YES | PK | The unique ID of the repair ticket record. |
| ticket_number | varchar(50) | YES | UK | The unique repair ticket tracking number. |
| customer_name | varchar(150) | YES | | The name of the bike owner. |
| customer_phone | varchar(50) | NO | | The contact number of the bike owner. |
| bike_model | varchar(150) | YES | | The brand, model, and description of the bicycle. |
| mechanic_name | varchar(100) | YES | | The name of the assigned bike mechanic. |
| service_type | varchar(100) | NO | | The type of repair or service requested. |
| problem_description | text | NO | | The reported bike issue or diagnostic notes. |
| status | varchar(50) | NO | | The repair progress status. |
| estimated_cost | decimal(10,2) | NO | | The estimated total repair cost. |
| estimated_finish | varchar(100) | NO | | The projected date or turnaround time for completion. |
| user_id | int(11) | NO | FK | Optional customer ID referencing the Users table. |
| order_id | int(11) | NO | FK | Optional order ID referencing the Orders table. |
| created_at | datetime | NO | | The date and time when the repair ticket was created. |
| updated_at | datetime | NO | | The date and time when the ticket was last updated. |
