# Online-Shopping (E-commerce) Application

An E-commerce website with NodeJS based APIs based on microservices and MongoDB databases.
Please check out the Software Engineering related documents of this project to understand how this project is structured using an event-driven and Microservices based architecture.

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

Every microservice has been thoroughly tested using JEST unit testing framework. 

Every microservice folder contains a Jenkinsfile and 2 Dockerfiles - one for testing level container and the other for production grade server. So, every microservice can be deployed inside its own Docker container at some testing / production site using Jenkins.
