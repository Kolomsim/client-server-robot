#!/usr/bin/env python
# coding:utf-8
import time

import numpy as np
import rospy
from dynamic_reconfigure.server import Server
from geometry_msgs.msg import Twist
from sensor_msgs.msg import LaserScan
from transbot_laser.cfg import laserAvoidPIDConfig
from Transbot_Lib import Transbot


class laserAvoid:
    def __init__(self):
        rospy.on_shutdown(self.cancel)
        self.r = rospy.Rate(20)
        self.linear = 0.01
        self.angular = 0.5
        self.ResponseDist = 0.5
        self.LaserAngle = 120
        self.Moving = False
        self.switch = False
        self.running = False
        self.Right_warning = 0
        self.Left_warning = 0
        self.front_warning = 0
        self.ros_ctrl = ROSCtrl()
        self.sub_laser = rospy.Subscriber("/scan", LaserScan, self.registerScan)
        Server(laserAvoidPIDConfig, self.dynamic_reconfigure_callback)
        self.navigation_active = False

    def cancel(self):
        self.ros_ctrl.cancel()
        self.sub_laser.unregister()
        rospy.loginfo("Shutting down this node.")

    def dynamic_reconfigure_callback(self, config, level):
        self.switch = config["switch"]
        self.linear = config["linear"]
        self.angular = config["angular"]
        self.LaserAngle = config["LaserAngle"]
        self.ResponseDist = config["ResponseDist"]
        return config

    def registerScan(self, scan_data):
        if self.running or not self.navigation_active:
            return

        try:
            ranges = np.array(scan_data.ranges)
            sortedIndices = np.argsort(ranges)

            self.Right_warning = 0
            self.Left_warning = 0
            self.front_warning = 0

            total_points = len(ranges)
            if total_points == 0:
                return

            front_sector = int(total_points * 0.15)
            side_sector = int(total_points * 0.25)

            for i in sortedIndices:
                if i < front_sector or i > (total_points - front_sector):
                    if ranges[i] < self.ResponseDist:
                        self.front_warning += 1
                elif front_sector <= i < (front_sector + side_sector):
                    if ranges[i] < self.ResponseDist:
                        self.Left_warning += 1
                elif (
                    (total_points - front_sector - side_sector)
                    <= i
                    < (total_points - front_sector)
                ):
                    if ranges[i] < self.ResponseDist:
                        self.Right_warning += 1

            print(
                f"L:{self.Left_warning} F:{self.front_warning} R:{self.Right_warning}"
            )

        except Exception as e:
            rospy.logerr(f"Error in registerScan: {str(e)}")

    def robot_move(self):
        while not rospy.is_shutdown():
            if not self.navigation_active:
                self.r.sleep()
                continue

            self.Moving = True
            twist = Twist()

            if (
                self.front_warning > 30
                and self.Left_warning > 30
                and self.Right_warning > 30
            ):
                print("1. Препятствия со всех сторон - отъезд назад")
                twist.linear.x = -0.15
                twist.angular.z = -self.angular
            elif (
                self.front_warning > 30
                and self.Left_warning <= 30
                and self.Right_warning > 30
            ):
                print("2. Препятствие спереди и справа - поворот налево")
                twist.linear.x = 0
                twist.angular.z = self.angular
            elif (
                self.front_warning > 30
                and self.Left_warning > 30
                and self.Right_warning <= 30
            ):
                print("3. Препятствие спереди и слева - поворот направо")
                twist.linear.x = 0
                twist.angular.z = -self.angular
            elif (
                self.front_warning > 30
                and self.Left_warning < 30
                and self.Right_warning < 30
            ):
                print("4. Препятствие только спереди - поворот налево")
                twist.linear.x = 0
                twist.angular.z = self.angular
            elif (
                self.front_warning < 30
                and self.Left_warning > 30
                and self.Right_warning > 30
            ):
                print("5. Препятствия слева и справа - движение вперед осторожно")
                twist.linear.x = self.linear * 0.5
                twist.angular.z = 0
            elif (
                self.front_warning < 30
                and self.Left_warning > 30
                and self.Right_warning <= 30
            ):
                print("6. Препятствие слева - небольшой поворот направо")
                twist.linear.x = self.linear * 0.7
                twist.angular.z = -0.3
            elif (
                self.front_warning < 30
                and self.Left_warning <= 30
                and self.Right_warning > 30
            ):
                print("7. Препятствие справа - небольшой поворот налево")
                twist.linear.x = self.linear * 0.7
                twist.angular.z = 0.3
            elif (
                self.front_warning <= 30
                and self.Left_warning <= 30
                and self.Right_warning <= 30
            ):
                print("8. Нет препятствий - движение вперед")
                twist.linear.x = self.linear
                twist.angular.z = 0

            self.ros_ctrl.pub_vel.publish(twist)
            self.r.sleep()


if __name__ == "__main__":
    rospy.init_node("laser_Avoidance", anonymous=False)
    tracker = laserAvoid()
    tracker.robot_move()
    rospy.spin()
    tracker.cancel()
