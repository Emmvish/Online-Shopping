# Online-Shopping (E-commerce) Application

An E-commerce website with NodeJS based APIs based on microservices and MongoDB databases. Uses Event Driven Architecture for orchestration of microservices.

This application offers the following features to its users (site admins, retailers and customers) :
1. List your product as a retailer.
2. Every product is moderated so that forbidden products do not get listed on this platform.
3. Obtain earnings through sale of products, periodically.
4. Fully featured role-based user management system.
5. Site administrators have the ability to manage the various activities of site users (retailers and customers).
6. Customers can place an order with the retailers provided that their desired product is available in sufficient quantity.
7. Retailers can view a list of all of their products and edit them if they need to.
8. Customers can search on the names of products as well as retailers, by passing a search term.
9. Every customer is allocated a cart to place their products in, so that they can order these products at the end of their shopping activity.
10. Forbidden or rejected products do not appear to the customers, in their search results.
11. Allow Retailers to provide their customers with discount coupons for their products.
12. Customers and Retailers to submit feedback about their experience with website, which site admins can view.
13. Allow customers to submit their complaints regarding a product to its respective seller and site admins.
14. Site Admins can moderate and hide objectionable products and users.
15. The Event Bus that carries events to various microservices has been implemented using RabbitMQ message broker.
16. Uses a 'Discovery' microservice to allow front end to establish contact with any other microservice in the system.
17. Also provides 'Authentication' microservice to allow a person to generate JWTs (i.e., Login) or to remove their JWT (i.e., Logout).

Every microservice has been thoroughly tested using JEST unit testing framework. 

Every microservice folder contains a Jenkinsfile and 2 Dockerfiles - one for testing level container and the other for production grade server. So, every microservice can be deployed inside its own Docker container at some testing / production site using Jenkins.
